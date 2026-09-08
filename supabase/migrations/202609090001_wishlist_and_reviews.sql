begin;

-- 1. Bảng danh sách yêu thích (Wishlists)
create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, product_id)
);

create index if not exists wishlists_user_idx on public.wishlists(user_id);
create index if not exists wishlists_product_idx on public.wishlists(product_id);

alter table public.wishlists enable row level security;

create policy wishlists_owner on public.wishlists for all to authenticated
using (user_id = (select auth.uid()) and (select private.is_active_user()))
with check (user_id = (select auth.uid()) and (select private.is_active_user()));

grant select, insert, delete on public.wishlists to authenticated;

-- 2. Bảng đánh giá và bình luận sản phẩm (Product Reviews)
create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  title text not null default '' check (length(title) <= 120),
  comment text not null check (length(btrim(comment)) between 3 and 2000),
  is_verified_purchase boolean not null default false,
  is_approved boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id, user_id)
);

create index if not exists reviews_product_idx on public.product_reviews(product_id);
create index if not exists reviews_user_idx on public.product_reviews(user_id);

alter table public.product_reviews enable row level security;

create policy reviews_read on public.product_reviews for select to anon, authenticated
using (is_approved or user_id = (select auth.uid()) or (select private.is_admin()));

create policy reviews_modify_owner on public.product_reviews for update to authenticated
using (user_id = (select auth.uid()) and (select private.is_active_user()))
with check (user_id = (select auth.uid()) and (select private.is_active_user()));

create policy reviews_delete_owner_or_admin on public.product_reviews for delete to authenticated
using ((user_id = (select auth.uid()) and (select private.is_active_user())) or (select private.is_admin()));

grant select on public.product_reviews to anon, authenticated;
grant update(rating, title, comment, updated_at), delete on public.product_reviews to authenticated;

-- 3. Hàm kiểm tra người mua thực tế (Verified Purchase)
create or replace function private.has_purchased_product(p_user_id uuid, p_product_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  return exists (
    select 1
    from public.orders o
    join public.order_items oi on oi.order_id = o.id
    join public.product_variants pv on pv.id = oi.variant_id
    where o.user_id = p_user_id
      and o.status in ('confirmed', 'shipping', 'completed')
      and pv.product_id = p_product_id
  );
end;
$$;

-- 4. RPC gửi đánh giá sản phẩm bảo mật
create or replace function public.submit_product_review(
  p_product_id uuid,
  p_rating smallint,
  p_title text,
  p_comment text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid;
  v_verified boolean;
  v_review_id uuid;
begin
  v_user_id := private.require_active_user();
  
  if p_rating not between 1 and 5 then
    raise exception 'Số sao đánh giá phải từ 1 đến 5' using errcode = '22023';
  end if;

  if length(btrim(coalesce(p_comment, ''))) < 3 or length(p_comment) > 2000 then
    raise exception 'Nội dung đánh giá phải từ 3 đến 2000 ký tự' using errcode = '22023';
  end if;

  if not exists (select 1 from public.products where id = p_product_id and is_active = true) then
    raise exception 'Sản phẩm không tồn tại hoặc đã ngừng kinh doanh' using errcode = '22023';
  end if;

  v_verified := private.has_purchased_product(v_user_id, p_product_id);

  insert into public.product_reviews(product_id, user_id, rating, title, comment, is_verified_purchase, is_approved, updated_at)
  values (
    p_product_id,
    v_user_id,
    p_rating,
    left(btrim(coalesce(p_title, '')), 120),
    btrim(p_comment),
    v_verified,
    true,
    now()
  )
  on conflict (product_id, user_id) do update set
    rating = excluded.rating,
    title = excluded.title,
    comment = excluded.comment,
    is_verified_purchase = excluded.is_verified_purchase or product_reviews.is_verified_purchase,
    updated_at = now()
  returning id into v_review_id;

  return jsonb_build_object(
    'success', true,
    'review_id', v_review_id,
    'is_verified', v_verified
  );
end;
$$;

revoke all on function public.submit_product_review(uuid, smallint, text, text) from public;
grant execute on function public.submit_product_review(uuid, smallint, text, text) to authenticated;

commit;
