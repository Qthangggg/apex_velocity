begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to anon, authenticated;

create function private.valid_address(p_address jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare
  field_name text;
begin
  if jsonb_typeof(p_address) is distinct from 'object' then return false; end if;
  if (select count(*) from jsonb_object_keys(p_address)) <> 6 then return false; end if;
  foreach field_name in array array['recipient', 'phone', 'line1', 'ward', 'district', 'city'] loop
    if jsonb_typeof(p_address -> field_name) is distinct from 'string'
       or (field_name <> 'district' and length(btrim(p_address ->> field_name)) < 2)
       or length(p_address ->> field_name) > (case when field_name = 'line1' then 250 else 120 end)
       or (p_address ->> field_name) ~ '[[:cntrl:]]' then return false; end if;
  end loop;
  return length(btrim(p_address ->> 'line1')) >= 5
     and btrim(p_address ->> 'phone') ~ '^\+?[0-9][0-9 ()-]{7,19}$'
     and length(regexp_replace(p_address ->> 'phone', '[^0-9]', '', 'g')) between 8 and 15;
end;
$$;

create function private.valid_email(p_email text) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(length(p_email) between 3 and 254
    and length(split_part(p_email, '@', 1)) <= 64
    and p_email = lower(btrim(p_email))
    and p_email ~ '^[a-z0-9!#$%&''*+/=?^_{|}~.-]+@[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'
    and p_email not like '%..%' and p_email not like '.%' and p_email not like '%.@%', false)
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  full_name text not null default '' check (length(full_name) <= 120),
  phone text not null default '' check (length(phone) <= 30),
  role text not null default 'user' check (role in ('user', 'admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 120),
  description text not null default '' check (length(description) <= 5000),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 160),
  name text not null check (length(btrim(name)) between 1 and 160),
  price numeric not null check (price between 0 and 1000000000 and price = trunc(price)),
  compare_at_price numeric check (compare_at_price between price and 1000000000 and compare_at_price = trunc(compare_at_price)),
  tagline text not null default '' check (length(tagline) <= 250),
  description text not null default '' check (length(description) <= 20000),
  highlights text[] not null default '{}' check (cardinality(highlights) <= 30 and array_position(highlights, null) is null),
  images text[] not null default '{}' check (cardinality(images) <= 20 and array_position(images, null) is null),
  is_active boolean not null default true,
  featured boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  size text not null check (length(btrim(size)) between 1 and 30),
  color text not null check (length(btrim(color)) between 1 and 60),
  swatch text not null default '#111111' check (swatch ~ '^#[0-9A-Fa-f]{6}$'),
  sku text not null unique check (length(btrim(sku)) between 1 and 80),
  stock integer not null default 0 check (stock >= 0),
  is_active boolean not null default true,
  unique(product_id, size, color)
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  recipient text not null,
  phone text not null,
  line1 text not null,
  ward text not null,
  district text not null,
  city text not null,
  created_at timestamptz not null default now(),
  check (private.valid_address(jsonb_build_object('recipient', recipient, 'phone', phone, 'line1', line1, 'ward', ward, 'district', district, 'city', city)))
);

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9][A-Z0-9_-]{0,63}$'),
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  amount numeric not null check (amount > 0 and amount <= 1000000000),
  min_order numeric not null default 0 check (min_order between 0 and 1000000000 and min_order = trunc(min_order)),
  max_uses integer check (max_uses > 0),
  used_count integer not null default 0 check (used_count >= 0),
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check ((discount_type = 'percent' and amount <= 100 and amount = round(amount, 2)) or (discount_type = 'fixed' and amount = trunc(amount))),
  check (max_uses is null or used_count <= max_uses)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  request_id uuid not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'shipping', 'completed', 'cancelled')),
  payment_method text not null check (payment_method in ('cod', 'bank_transfer')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid')),
  subtotal numeric not null check (subtotal >= 0 and subtotal = trunc(subtotal)),
  discount numeric not null check (discount between 0 and subtotal and discount = trunc(discount)),
  shipping_fee numeric not null check (shipping_fee = case when subtotal >= 1500000 then 0 else 30000 end),
  total numeric not null check (total = subtotal - discount + shipping_fee),
  coupon_code text,
  shipping_address jsonb not null check (private.valid_address(shipping_address)),
  note text not null default '' check (length(note) <= 2000),
  created_at timestamptz not null default now(),
  unique(user_id, request_id),
  check (status <> 'cancelled' or payment_status = 'unpaid'),
  check (status <> 'completed' or payment_status = 'paid'),
  check (payment_method <> 'bank_transfer' or status not in ('confirmed', 'shipping', 'completed') or payment_status = 'paid')
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  product_name text not null,
  image text not null default '',
  size text not null,
  color text not null,
  unit_price numeric not null check (unit_price between 0 and 1000000000 and unit_price = trunc(unit_price)),
  quantity integer not null check (quantity between 1 and 99),
  unique(order_id, variant_id)
);

create table public.newsletter_subscriptions (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (private.valid_email(email)),
  created_at timestamptz not null default now()
);

create table private.checkout_requests (
  user_id uuid not null references public.profiles(id) on delete restrict,
  request_id uuid not null,
  payload jsonb not null,
  order_id uuid not null unique references public.orders(id) on delete restrict,
  primary key(user_id, request_id)
);

create index products_category_id_idx on public.products(category_id);
create index products_active_created_idx on public.products(created_at desc) where is_active;
create index addresses_user_id_idx on public.addresses(user_id);
create index orders_user_created_idx on public.orders(user_id, created_at desc);
create index orders_status_created_idx on public.orders(status, created_at desc);
create index order_items_variant_id_idx on public.order_items(variant_id);
create index profiles_active_admin_idx on public.profiles(id) where role = 'admin' and is_active;

create function private.is_active_user() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = (select auth.uid()) and is_active)
$$;

create function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = (select auth.uid()) and is_active and role = 'admin')
$$;

create function private.require_active_user() returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  user_id uuid := auth.uid();
begin
  perform 1 from public.profiles where id = user_id and is_active for share;
  if not found then raise exception 'Active authentication required' using errcode = '42501'; end if;
  return user_id;
end;
$$;

create function private.handle_signup() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, full_name)
  values (new.id, left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 120));
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function private.handle_signup();

insert into public.profiles(id, full_name)
select id, left(btrim(coalesce(raw_user_meta_data ->> 'full_name', '')), 120)
from auth.users on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.addresses enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.newsletter_subscriptions enable row level security;
alter table private.checkout_requests enable row level security;

create policy profiles_read on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select private.is_admin()));
create policy categories_read on public.categories for select to anon, authenticated
using (is_active or (select private.is_admin()));
create policy products_read on public.products for select to anon, authenticated
using ((is_active and (category_id is null or exists(select 1 from public.categories where id = category_id and is_active))) or (select private.is_admin()));
create policy variants_read on public.product_variants for select to anon, authenticated
using ((is_active and exists(select 1 from public.products where id = product_id and is_active)) or (select private.is_admin()));
create policy categories_admin on public.categories for all to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));
create policy products_admin on public.products for all to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));
create policy variants_admin on public.product_variants for all to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));
create policy addresses_owner on public.addresses for all to authenticated
using (user_id = (select auth.uid()) and (select private.is_active_user()))
with check (user_id = (select auth.uid()) and (select private.is_active_user()));
create policy coupons_admin on public.coupons for all to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));
create policy orders_read on public.orders for select to authenticated
using ((user_id = (select auth.uid()) and (select private.is_active_user())) or (select private.is_admin()));
create policy order_items_read on public.order_items for select to authenticated
using (exists(select 1 from public.orders where id = order_id));
create policy newsletter_admin on public.newsletter_subscriptions for all to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));

revoke all on public.profiles, public.categories, public.products, public.product_variants,
  public.addresses, public.coupons, public.orders, public.order_items, public.newsletter_subscriptions
  from public, anon, authenticated;
revoke all on private.checkout_requests from public, anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.categories, public.products, public.product_variants to anon, authenticated;
grant select on public.profiles, public.addresses, public.coupons, public.orders, public.order_items, public.newsletter_subscriptions to authenticated;
grant insert, update, delete on public.categories, public.products, public.product_variants, public.addresses, public.newsletter_subscriptions to authenticated;
grant delete on public.coupons to authenticated;
grant insert(id, code, discount_type, amount, min_order, max_uses, expires_at, is_active),
  update(code, discount_type, amount, min_order, max_uses, expires_at, is_active) on public.coupons to authenticated;

create function public.update_my_profile(p_full_name text, p_phone text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  user_id uuid := private.require_active_user();
begin
  if p_full_name is null or length(btrim(p_full_name)) not between 1 and 120
     or p_phone is null or length(btrim(p_phone)) > 30
     or p_full_name ~ '[[:cntrl:]]' or p_phone ~ '[[:cntrl:]]' then
    raise exception 'Invalid profile details' using errcode = '22023';
  end if;
  update public.profiles set full_name = btrim(p_full_name), phone = btrim(p_phone) where id = user_id;
end;
$$;

create function public.subscribe_newsletter(p_email text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  normalized_email text := lower(btrim(p_email));
begin
  perform private.require_active_user();
  if not private.valid_email(normalized_email) then
    raise exception 'Invalid email address' using errcode = '22023';
  end if;
  insert into public.newsletter_subscriptions(email) values (normalized_email) on conflict(email) do nothing;
end;
$$;

create function public.checkout(
  p_items jsonb,
  p_address jsonb,
  p_payment_method text,
  p_coupon_code text,
  p_note text,
  p_request_id uuid,
  p_expected_total numeric
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  current_user_id uuid := private.require_active_user();
  item jsonb;
  normalized_items jsonb;
  normalized_address jsonb;
  normalized_code text := upper(btrim(coalesce(p_coupon_code, '')));
  normalized_note text := btrim(coalesce(p_note, ''));
  request_payload jsonb;
  existing_request private.checkout_requests%rowtype;
  selected_coupon public.coupons%rowtype;
  selected_item record;
  item_snapshots jsonb := '[]'::jsonb;
  order_id uuid := gen_random_uuid();
  item_count integer;
  locked_count integer;
  order_subtotal numeric := 0;
  order_discount numeric := 0;
  order_shipping numeric;
begin
  if p_request_id is null or p_payment_method is null or p_payment_method not in ('cod', 'bank_transfer')
     or length(normalized_note) > 2000 or length(normalized_code) > 64
     or p_expected_total is null or p_expected_total < 0 or p_expected_total > 9900000030000
     or p_expected_total <> trunc(p_expected_total) then
    raise exception 'Invalid checkout details' using errcode = '22023';
  end if;
  if not private.valid_address(p_address) then
    raise exception 'Invalid shipping address' using errcode = '22023';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'Items must be an array' using errcode = '22023';
  end if;
  item_count := jsonb_array_length(p_items);
  if item_count not between 1 and 100 then
    raise exception 'Checkout requires 1 to 100 distinct variants' using errcode = '22023';
  end if;
  for item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(item) is distinct from 'object' then
      raise exception 'Invalid checkout item' using errcode = '22023';
    end if;
    if (select count(*) from jsonb_object_keys(item)) <> 2
       or jsonb_typeof(item -> 'variant_id') is distinct from 'string'
       or jsonb_typeof(item -> 'quantity') is distinct from 'number'
       or (item ->> 'quantity') !~ '^[1-9][0-9]?$' then
      raise exception 'Each item requires a variant_id and integer quantity from 1 to 99' using errcode = '22023';
    end if;
  end loop;
  select jsonb_agg(jsonb_build_object('variant_id', entry.variant_id, 'quantity', entry.quantity) order by entry.variant_id),
         count(distinct entry.variant_id)
  into normalized_items, locked_count
  from jsonb_to_recordset(p_items) as entry(variant_id uuid, quantity integer);
  if locked_count <> item_count then
    raise exception 'Duplicate or missing variants' using errcode = '22023';
  end if;
  select jsonb_object_agg(key, btrim(value)) into normalized_address from jsonb_each_text(p_address);
  request_payload := jsonb_build_object('items', normalized_items, 'address', normalized_address,
    'payment_method', p_payment_method, 'coupon_code', normalized_code, 'note', normalized_note, 'expected_total', p_expected_total);
  perform pg_advisory_xact_lock(hashtextextended('shop-checkout:' || current_user_id::text || ':' || p_request_id::text, 0));
  select * into existing_request from private.checkout_requests
  where user_id = current_user_id and request_id = p_request_id;
  if found then
    if existing_request.payload is distinct from request_payload then
      raise exception 'Request ID was already used with different checkout details' using errcode = '22023';
    end if;
    return existing_request.order_id;
  end if;

  perform variant.id from public.product_variants as variant
  join jsonb_to_recordset(normalized_items) as entry(variant_id uuid, quantity integer) on entry.variant_id = variant.id
  order by variant.id for update of variant;
  get diagnostics locked_count = row_count;
  if locked_count <> item_count then raise exception 'One or more variants are unavailable'; end if;
  perform product.id from public.products as product where product.id in (
    select variant.product_id from public.product_variants as variant
    join jsonb_to_recordset(normalized_items) as entry(variant_id uuid, quantity integer) on entry.variant_id = variant.id
  ) order by product.id for share of product;
  perform category.id from public.categories as category where category.id in (
    select product.category_id from public.products as product
    join public.product_variants as variant on variant.product_id = product.id
    join jsonb_to_recordset(normalized_items) as entry(variant_id uuid, quantity integer) on entry.variant_id = variant.id
  ) order by category.id for share of category;

  for selected_item in
    select variant.id, variant.size, variant.color, variant.stock, variant.is_active as variant_active,
           product.name, product.images, product.price, product.is_active as product_active,
           product.category_id, category.is_active as category_active, entry.quantity
    from jsonb_to_recordset(normalized_items) as entry(variant_id uuid, quantity integer)
    join public.product_variants as variant on variant.id = entry.variant_id
    join public.products as product on product.id = variant.product_id
    left join public.categories as category on category.id = product.category_id
    order by variant.id
  loop
    if not selected_item.variant_active or not selected_item.product_active
       or (selected_item.category_id is not null and not selected_item.category_active) then
      raise exception 'One or more variants are unavailable';
    end if;
    if selected_item.stock < selected_item.quantity then raise exception 'Insufficient stock'; end if;
    order_subtotal := order_subtotal + selected_item.price * selected_item.quantity;
    item_snapshots := item_snapshots || jsonb_build_array(jsonb_build_object(
      'variant_id', selected_item.id, 'product_name', selected_item.name,
      'image', coalesce(selected_item.images[1], ''), 'size', selected_item.size, 'color', selected_item.color,
      'unit_price', selected_item.price, 'quantity', selected_item.quantity));
  end loop;
  if normalized_code <> '' then
    select * into selected_coupon from public.coupons where code = normalized_code for update;
    if not found or not selected_coupon.is_active
       or (selected_coupon.expires_at is not null and selected_coupon.expires_at <= clock_timestamp())
       or (selected_coupon.max_uses is not null and selected_coupon.used_count >= selected_coupon.max_uses)
       or selected_coupon.min_order > order_subtotal then
      raise exception 'Coupon is unavailable for this order';
    end if;
    order_discount := least(order_subtotal, case when selected_coupon.discount_type = 'percent'
      then floor(order_subtotal * selected_coupon.amount / 100) else selected_coupon.amount end);
  end if;
  order_shipping := case when order_subtotal >= 1500000 then 0 else 30000 end;
  if p_expected_total <> order_subtotal - order_discount + order_shipping then
    raise exception 'Checkout total changed. Review prices and coupon, then try again.' using errcode = '22023';
  end if;
  if selected_coupon.id is not null then
    update public.coupons set used_count = used_count + 1 where id = selected_coupon.id;
  end if;
  insert into public.orders(id, user_id, request_id, payment_method, subtotal, discount, shipping_fee, total, coupon_code, shipping_address, note)
  values (order_id, current_user_id, p_request_id, p_payment_method, order_subtotal, order_discount, order_shipping,
          order_subtotal - order_discount + order_shipping, nullif(normalized_code, ''), normalized_address, normalized_note);
  insert into public.order_items(order_id, variant_id, product_name, image, size, color, unit_price, quantity)
  select order_id, snapshot.variant_id, snapshot.product_name, snapshot.image, snapshot.size, snapshot.color, snapshot.unit_price, snapshot.quantity
  from jsonb_to_recordset(item_snapshots) as snapshot(variant_id uuid, product_name text, image text, size text, color text, unit_price numeric, quantity integer);
  update public.product_variants as variant set stock = variant.stock - entry.quantity
  from jsonb_to_recordset(normalized_items) as entry(variant_id uuid, quantity integer)
  where variant.id = entry.variant_id;
  insert into private.checkout_requests(user_id, request_id, payload, order_id)
  values (current_user_id, p_request_id, request_payload, order_id);
  return order_id;
end;
$$;

create function public.preview_coupon(p_code text, p_subtotal numeric) returns numeric
language plpgsql security definer set search_path = '' as $$
declare
  selected_coupon public.coupons%rowtype;
  normalized_code text := upper(btrim(coalesce(p_code, '')));
begin
  perform private.require_active_user();
  if p_subtotal is null or p_subtotal < 0 or p_subtotal > 9900000000000 or p_subtotal <> trunc(p_subtotal)
     or length(normalized_code) not between 1 and 64 then
    raise exception 'Invalid coupon preview input' using errcode = '22023';
  end if;
  select * into selected_coupon from public.coupons where code = normalized_code;
  if not found or not selected_coupon.is_active
     or (selected_coupon.expires_at is not null and selected_coupon.expires_at <= clock_timestamp())
     or (selected_coupon.max_uses is not null and selected_coupon.used_count >= selected_coupon.max_uses)
     or selected_coupon.min_order > p_subtotal then
    raise exception 'Coupon is unavailable for this order';
  end if;
  return least(p_subtotal, case when selected_coupon.discount_type = 'percent'
    then floor(p_subtotal * selected_coupon.amount / 100) else selected_coupon.amount end);
end;
$$;

create function public.cancel_order(p_order_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  current_user_id uuid := private.require_active_user();
  selected_order public.orders%rowtype;
begin
  select * into selected_order from public.orders
  where id = p_order_id and (user_id = current_user_id or private.is_admin()) for update;
  if not found then raise exception 'Order not found or access denied' using errcode = '42501'; end if;
  if selected_order.status = 'cancelled' then return; end if;
  if selected_order.status <> 'pending' or selected_order.payment_status <> 'unpaid' then
    raise exception 'Only pending unpaid orders can be cancelled' using errcode = '22023';
  end if;
  perform variant.id from public.product_variants as variant
  join public.order_items as item on item.variant_id = variant.id
  where item.order_id = p_order_id order by variant.id for update of variant;
  update public.product_variants as variant set stock = variant.stock + item.quantity
  from public.order_items as item where item.order_id = p_order_id and item.variant_id = variant.id;
  update public.orders set status = 'cancelled' where id = p_order_id;
end;
$$;

create function public.admin_update_order(p_order_id uuid, p_status text, p_payment_status text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  selected_order public.orders%rowtype;
begin
  perform private.require_active_user();
  if not private.is_admin() then raise exception 'Active admin required' using errcode = '42501'; end if;
  if p_status is null or p_status not in ('pending', 'confirmed', 'shipping', 'completed', 'cancelled')
     or p_payment_status is null or p_payment_status not in ('unpaid', 'paid') then
    raise exception 'Invalid order state' using errcode = '22023';
  end if;
  select * into selected_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found' using errcode = '22023'; end if;
  if selected_order.payment_status = 'paid' and p_payment_status <> 'paid' then
    raise exception 'A recorded payment cannot be reversed' using errcode = '22023';
  end if;
  if p_status = 'cancelled' then
    if p_payment_status <> 'unpaid' then raise exception 'Paid orders cannot be cancelled' using errcode = '22023'; end if;
    perform public.cancel_order(p_order_id);
    return;
  end if;
  if selected_order.status = 'cancelled' then raise exception 'Cancelled orders are terminal' using errcode = '22023'; end if;
  if p_status <> selected_order.status and not (
    (selected_order.status = 'pending' and p_status = 'confirmed') or
    (selected_order.status = 'confirmed' and p_status = 'shipping') or
    (selected_order.status = 'shipping' and p_status = 'completed')
  ) then raise exception 'Invalid order transition' using errcode = '22023'; end if;
  if (p_status = 'completed' or (selected_order.payment_method = 'bank_transfer' and p_status in ('confirmed', 'shipping')))
     and p_payment_status <> 'paid' then
    raise exception 'Payment must be verified before this transition' using errcode = '22023';
  end if;
  update public.orders set status = p_status, payment_status = p_payment_status where id = p_order_id;
end;
$$;

create function public.admin_update_user(p_user_id uuid, p_role text, p_is_active boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  current_user_id uuid := auth.uid();
  selected_user public.profiles%rowtype;
begin
  if current_user_id is null then raise exception 'Active admin required' using errcode = '42501'; end if;
  if p_user_id is null or p_role is null or p_role not in ('user', 'admin') or p_is_active is null then
    raise exception 'Invalid user state' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('shop-admin-membership', 0));
  perform id from public.profiles where role = 'admin' or id in (current_user_id, p_user_id) order by id for update;
  if not private.is_admin() then raise exception 'Active admin required' using errcode = '42501'; end if;
  select * into selected_user from public.profiles where id = p_user_id;
  if not found then raise exception 'User not found' using errcode = '22023'; end if;
  if selected_user.role = 'admin' and selected_user.is_active and (p_role <> 'admin' or not p_is_active)
     and (select count(*) from public.profiles where role = 'admin' and is_active) <= 1 then
    raise exception 'Cannot demote or deactivate the last active admin' using errcode = '22023';
  end if;
  update public.profiles set role = p_role, is_active = p_is_active where id = p_user_id;
end;
$$;

revoke execute on function private.valid_address(jsonb), private.valid_email(text), private.is_active_user(),
  private.is_admin(), private.require_active_user(), private.handle_signup() from public, anon, authenticated;
grant execute on function private.is_admin() to anon, authenticated;
grant execute on function private.is_active_user(), private.valid_address(jsonb), private.valid_email(text) to authenticated;
revoke execute on function public.checkout(jsonb,jsonb,text,text,text,uuid,numeric), public.cancel_order(uuid),
  public.admin_update_order(uuid,text,text), public.admin_update_user(uuid,text,boolean),
  public.update_my_profile(text,text), public.subscribe_newsletter(text), public.preview_coupon(text,numeric) from public, anon, authenticated;
grant execute on function public.checkout(jsonb,jsonb,text,text,text,uuid,numeric), public.cancel_order(uuid),
  public.admin_update_order(uuid,text,text), public.admin_update_user(uuid,text,boolean),
  public.update_my_profile(text,text), public.subscribe_newsletter(text), public.preview_coupon(text,numeric) to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict(id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
create policy product_images_public_read on storage.objects for select to anon, authenticated
using (bucket_id = 'product-images');
create policy product_images_admin_insert on storage.objects for insert to authenticated
with check (bucket_id = 'product-images' and (select private.is_admin()));
create policy product_images_admin_update on storage.objects for update to authenticated
using (bucket_id = 'product-images' and (select private.is_admin()))
with check (bucket_id = 'product-images' and (select private.is_admin()));
create policy product_images_admin_delete on storage.objects for delete to authenticated
using (bucket_id = 'product-images' and (select private.is_admin()));

commit;
