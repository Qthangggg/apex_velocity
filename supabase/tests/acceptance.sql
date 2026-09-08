\set ON_ERROR_STOP on
begin;
create function pg_temp.check_assert(p_condition boolean, p_message text) returns void
language plpgsql as $$
begin
  if p_condition is distinct from true then
    raise exception 'FAIL: %', p_message;
  end if;
end;
$$;
create function pg_temp.expect_error(p_statement text, p_pattern text) returns void
language plpgsql as $$
declare
  error_message text;
begin
  begin
    execute p_statement;
  exception when others then
    get stacked diagnostics error_message = message_text;
    if error_message !~* p_pattern then
      raise exception 'Unexpected failure: % (expected %)', error_message, p_pattern;
    end if;
    return;
  end;
  raise exception 'Expected rejection: %', p_statement;
end;
$$;
select pg_temp.check_assert(to_regprocedure('public.checkout(jsonb,jsonb,text,text,text,uuid,numeric)') is not null, 'checkout exists');

create function pg_temp.shipping_address() returns jsonb language sql as $$
  select '{"recipient":"Test Buyer","phone":"0901234567","line1":"123 Test Street","ward":"Test Ward","district":"","city":"Ho Chi Minh City"}'::jsonb
$$;
create function pg_temp.buy(p_request_id uuid, p_quantity integer default 1, p_code text default '', p_method text default 'cod')
returns uuid language sql as $$
  select public.checkout(jsonb_build_array(jsonb_build_object('variant_id', 'f0000000-0000-4000-8000-000000000301', 'quantity', p_quantity)),
    pg_temp.shipping_address(), p_method, p_code, 'Acceptance check', p_request_id,
    p_quantity * 500000 - case when upper(btrim(p_code)) = 'CHECK10' then p_quantity * 50000
    when p_code = 'CHECKFIX' then least(p_quantity * 500000, 900000) else 0 end
    + case when p_quantity * 500000 >= 1500000 then 0 else 30000 end)
$$;
create temporary table test_orders(label text primary key, id uuid not null);
grant select, insert on test_orders to authenticated;

insert into auth.users(id, email, raw_user_meta_data) values
  ('a0000000-0000-4000-8000-000000000001', 'buyer-one@shop-test.invalid', '{"full_name":"Buyer One","role":"admin","is_active":false}'),
  ('a0000000-0000-4000-8000-000000000002', 'buyer-two@shop-test.invalid', '{"full_name":"Buyer Two"}'),
  ('a0000000-0000-4000-8000-000000000003', 'admin@shop-test.invalid', '{}'),
  ('a0000000-0000-4000-8000-000000000004', 'disabled@shop-test.invalid', '{}');
update public.profiles set role = 'admin' where id = 'a0000000-0000-4000-8000-000000000003';
update public.profiles set is_active = false where id = 'a0000000-0000-4000-8000-000000000004';
insert into public.categories(id, name, slug, is_active) values
  ('f0000000-0000-4000-8000-000000000101', 'Acceptance', 'acceptance-active', true),
  ('f0000000-0000-4000-8000-000000000102', 'Archived', 'acceptance-archived', false);
insert into public.products(id, category_id, slug, name, price, images, is_active) values
  ('f0000000-0000-4000-8000-000000000201', 'f0000000-0000-4000-8000-000000000101', 'acceptance-product', 'Original product', 500000, array['/images/elite-socks.jpg'], true),
  ('f0000000-0000-4000-8000-000000000202', 'f0000000-0000-4000-8000-000000000102', 'acceptance-hidden-category', 'Hidden category product', 500000, '{}', true),
  ('f0000000-0000-4000-8000-000000000203', null, 'acceptance-hidden-product', 'Hidden product', 500000, '{}', false);
insert into public.product_variants(id, product_id, size, color, sku, stock, is_active) values
  ('f0000000-0000-4000-8000-000000000301', 'f0000000-0000-4000-8000-000000000201', 'M', 'Black', 'ACCEPTANCE-M', 10, true),
  ('f0000000-0000-4000-8000-000000000302', 'f0000000-0000-4000-8000-000000000201', 'L', 'Black', 'ACCEPTANCE-L', 0, true),
  ('f0000000-0000-4000-8000-000000000303', 'f0000000-0000-4000-8000-000000000201', 'XL', 'Black', 'ACCEPTANCE-XL', 10, false),
  ('f0000000-0000-4000-8000-000000000304', 'f0000000-0000-4000-8000-000000000202', 'M', 'Black', 'ACCEPTANCE-HIDDEN-CATEGORY', 10, true),
  ('f0000000-0000-4000-8000-000000000305', 'f0000000-0000-4000-8000-000000000203', 'M', 'Black', 'ACCEPTANCE-HIDDEN-PRODUCT', 10, true);
insert into public.coupons(id, code, discount_type, amount, min_order, max_uses, expires_at, is_active) values
  ('f0000000-0000-4000-8000-000000000401', 'CHECK10', 'percent', 10, 500000, 2, null, true),
  ('f0000000-0000-4000-8000-000000000402', 'CHECKFIX', 'fixed', 900000, 0, null, null, true),
  ('f0000000-0000-4000-8000-000000000403', 'CHECKEXPIRED', 'percent', 10, 0, null, now() - interval '1 second', true),
  ('f0000000-0000-4000-8000-000000000404', 'CHECKINACTIVE', 'percent', 10, 0, null, null, false),
  ('f0000000-0000-4000-8000-000000000405', 'CHECKDECIMAL', 'percent', 12.55, 0, null, null, true);

do $$
declare
  contract record;
begin
  for contract in select * from (values
    ('profiles', 'id,full_name,phone,role,is_active,created_at'),
    ('categories', 'id,name,slug,description,is_active,created_at'),
    ('products', 'id,category_id,slug,name,price,compare_at_price,tagline,description,highlights,images,is_active,featured,created_at'),
    ('product_variants', 'id,product_id,size,color,swatch,sku,stock,is_active'),
    ('addresses', 'id,user_id,recipient,phone,line1,ward,district,city,created_at'),
    ('coupons', 'id,code,discount_type,amount,min_order,max_uses,used_count,expires_at,is_active,created_at'),
    ('orders', 'id,user_id,request_id,status,payment_method,payment_status,subtotal,discount,shipping_fee,total,coupon_code,shipping_address,note,created_at'),
    ('order_items', 'id,order_id,variant_id,product_name,image,size,color,unit_price,quantity'),
    ('newsletter_subscriptions', 'id,email,created_at')
  ) as expected(table_name, column_names) loop
    perform pg_temp.check_assert((select string_agg(column_name, ',' order by ordinal_position) = contract.column_names
      from information_schema.columns where table_schema = 'public' and table_name = contract.table_name), 'Exact shared contract: ' || contract.table_name);
  end loop;
  perform pg_temp.check_assert((select role = 'user' and is_active and full_name = 'Buyer One' from public.profiles where id = 'a0000000-0000-4000-8000-000000000001'), 'Signup ignores privileged metadata');
  perform pg_temp.check_assert((select public and file_size_limit = 5242880 and allowed_mime_types = array['image/jpeg','image/png','image/webp','image/avif'] from storage.buckets where id = 'product-images'), 'Storage bucket restrictions');
  perform pg_temp.check_assert(not has_function_privilege('anon', 'public.checkout(jsonb,jsonb,text,text,text,uuid,numeric)', 'EXECUTE'), 'Anonymous checkout denied');
  perform pg_temp.check_assert(not has_function_privilege('authenticated', 'private.handle_signup()', 'EXECUTE'), 'Signup trigger cannot be called directly');
  perform pg_temp.check_assert(not has_function_privilege('authenticated', 'private.require_active_user()', 'EXECUTE'), 'Lock helper is private');
end;
$$;

set local role anon;
select pg_temp.check_assert((select count(*) = 1 from public.products where id::text like 'f0000000%'), 'Only active catalog visible');
select pg_temp.check_assert((select count(*) = 2 from public.product_variants where id::text like 'f0000000%'), 'Variant visibility includes active parent/category');
select pg_temp.expect_error('select * from public.profiles', 'permission denied');
select pg_temp.expect_error('select * from public.orders', 'permission denied');
select pg_temp.expect_error('select public.subscribe_newsletter(''anon@example.com'')', 'permission denied');
select pg_temp.expect_error('select public.preview_coupon(''CHECK10'', 500000)', 'permission denied');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000001', true);
do $$
declare
  placed_order uuid;
  invalid_quantity jsonb;
  invalid_item jsonb;
begin
  perform pg_temp.check_assert((select count(*) = 1 from public.profiles where id::text like 'a0000000%'), 'Own profile only');
  perform pg_temp.expect_error('update public.profiles set role = ''admin'' where id = auth.uid()', 'permission denied');
  perform pg_temp.expect_error('update public.profiles set is_active = true where id = auth.uid()', 'permission denied');
  perform pg_temp.expect_error('insert into public.profiles(id) values (auth.uid())', 'permission denied');
  perform pg_temp.expect_error('select public.admin_update_user(auth.uid(), ''admin'', true)', 'Active admin required');
  perform pg_temp.expect_error('select * from private.checkout_requests', 'permission denied');
  perform public.update_my_profile('  Buyer Updated  ', '0901234567');
  perform pg_temp.check_assert((select full_name = 'Buyer Updated' and role = 'user' from public.profiles where id = auth.uid()), 'Safe profile update');
  perform pg_temp.expect_error('insert into public.categories(name,slug) values (''Forbidden'', ''forbidden'')', 'row-level security');
  perform pg_temp.expect_error('insert into public.product_variants(product_id,size,color,sku) values (''f0000000-0000-4000-8000-000000000201'',''XXL'',''Black'',''FORBIDDEN'')', 'row-level security');
  update public.product_variants set stock = 1000 where id = 'f0000000-0000-4000-8000-000000000301';
  perform pg_temp.check_assert(not found, 'Non-admin stock update affects zero rows');
  perform pg_temp.check_assert((select count(*) = 0 from public.coupons), 'Coupon rows are admin-only');
  perform pg_temp.check_assert(public.preview_coupon(' check10 ', 1000000) = 100000, 'Percent preview');
  perform pg_temp.check_assert(public.preview_coupon('CHECKFIX', 500000) = 500000, 'Fixed preview capped at subtotal');
  perform pg_temp.check_assert(public.preview_coupon('CHECKDECIMAL', 500001) = 62750, 'Fractional percentage rounds down to VND');
  perform pg_temp.expect_error('select public.preview_coupon(''CHECK10'', 100)', 'unavailable');
  perform pg_temp.expect_error('select public.preview_coupon(''CHECKEXPIRED'', 500000)', 'unavailable');
  perform pg_temp.expect_error('select public.preview_coupon(''CHECKINACTIVE'', 500000)', 'unavailable');
  perform pg_temp.expect_error('select public.preview_coupon(''CHECK%'', 500000)', 'unavailable');
  perform pg_temp.expect_error('select public.preview_coupon(''CHECK10'', ''NaN''::numeric)', 'Invalid');
  perform pg_temp.expect_error('select public.preview_coupon(''CHECK10'', -1)', 'Invalid');
  perform public.subscribe_newsletter('  SOMEONE@Example.com  ');
  perform public.subscribe_newsletter('someone@example.com');
  perform pg_temp.check_assert((select count(*) = 0 from public.newsletter_subscriptions), 'Subscriber cannot enumerate emails');
  perform pg_temp.expect_error('select public.subscribe_newsletter(''not-an-email'')', 'Invalid email');
  perform pg_temp.expect_error('insert into public.newsletter_subscriptions(email) values (''direct@example.com'')', 'row-level security');
  insert into public.addresses(recipient,phone,line1,ward,district,city) values ('Buyer One','0901234567','123 Test Street','Test Ward','','Test City');
  perform pg_temp.expect_error('insert into public.addresses(user_id,recipient,phone,line1,ward,district,city) values (''a0000000-0000-4000-8000-000000000002'',''Buyer Two'',''0901234567'',''123 Test Street'',''Test Ward'','''',''Test City'')', 'row-level security');
  perform pg_temp.expect_error('insert into public.addresses(recipient,phone,line1,ward,district,city) values (''Buyer One'',''bad'',''123 Test Street'',''Test Ward'','''',''Test City'')', 'check constraint');

  foreach invalid_quantity in array array['0'::jsonb, '-1'::jsonb, '1.5'::jsonb, '100'::jsonb, '"2"'::jsonb, 'null'::jsonb, 'true'::jsonb] loop
    invalid_item := jsonb_build_array(jsonb_build_object('variant_id','f0000000-0000-4000-8000-000000000301','quantity',invalid_quantity));
    perform pg_temp.expect_error(format('select public.checkout(%L::jsonb,pg_temp.shipping_address(),''cod'','''','''',gen_random_uuid(),0)', invalid_item), 'integer quantity');
  end loop;
  perform pg_temp.expect_error('select public.checkout(''[]'',pg_temp.shipping_address(),''cod'','''','''',gen_random_uuid(),0)', '1 to 100');
  perform pg_temp.expect_error('select public.checkout(''{}'',pg_temp.shipping_address(),''cod'','''','''',gen_random_uuid(),0)', 'array');
  perform pg_temp.expect_error('select public.checkout(''[null]'',pg_temp.shipping_address(),''cod'','''','''',gen_random_uuid(),0)', 'Invalid checkout item');
  perform pg_temp.expect_error('select public.checkout(''[{"variant_id":"f0000000-0000-4000-8000-000000000301","quantity":1,"price":1}]'',pg_temp.shipping_address(),''cod'','''','''',gen_random_uuid(),0)', 'integer quantity');
  perform pg_temp.expect_error('select public.checkout(''[{"variant_id":"f0000000-0000-4000-8000-000000000301","quantity":1},{"variant_id":"f0000000-0000-4000-8000-000000000301","quantity":1}]'',pg_temp.shipping_address(),''cod'','''','''',gen_random_uuid(),0)', 'Duplicate');
  perform pg_temp.expect_error('select public.checkout(''[{"variant_id":"f0000000-0000-4000-8000-000000000301","quantity":1}]'',pg_temp.shipping_address() - ''ward'',''cod'','''','''',gen_random_uuid(),0)', 'Invalid shipping');
  perform pg_temp.expect_error('select pg_temp.buy(gen_random_uuid(), 1, '''', ''card'')', 'Invalid checkout');
  perform pg_temp.expect_error('select pg_temp.buy(null)', 'Invalid checkout');
  perform pg_temp.expect_error('select public.checkout(''[{"variant_id":"f0000000-0000-4000-8000-000000000301","quantity":1}]'',pg_temp.shipping_address(),''cod'',''CHECK10'','''',gen_random_uuid(),1)', 'total changed');
  perform pg_temp.expect_error('select public.checkout(''[{"variant_id":"f0000000-0000-4000-8000-000000000301","quantity":1}]'',pg_temp.shipping_address(),''cod'','''','''',gen_random_uuid(),null)', 'Invalid checkout');
  perform pg_temp.expect_error('select pg_temp.buy(gen_random_uuid(), 11)', 'Insufficient stock');
  perform pg_temp.expect_error('select public.checkout(''[{"variant_id":"f0000000-0000-4000-8000-000000000301","quantity":1},{"variant_id":"f0000000-0000-4000-8000-000000000302","quantity":1}]'',pg_temp.shipping_address(),''cod'',''CHECK10'','''',gen_random_uuid(),0)', 'Insufficient stock');
  perform pg_temp.expect_error('select public.checkout(''[{"variant_id":"f0000000-0000-4000-8000-000000000303","quantity":1}]'',pg_temp.shipping_address(),''cod'','''','''',gen_random_uuid(),0)', 'unavailable');
  perform pg_temp.expect_error('select public.checkout(''[{"variant_id":"f0000000-0000-4000-8000-000000000304","quantity":1}]'',pg_temp.shipping_address(),''cod'','''','''',gen_random_uuid(),0)', 'unavailable');
  perform pg_temp.check_assert((select stock = 10 from public.product_variants where id = 'f0000000-0000-4000-8000-000000000301'), 'Rejected checkouts leave stock unchanged');
  perform pg_temp.check_assert((select count(*) = 0 from public.orders where user_id = auth.uid()), 'Rejected checkouts create no orders');

  placed_order := pg_temp.buy('b0000000-0000-4000-8000-000000000001', 2, 'CHECK10');
  insert into test_orders values ('main', placed_order);
  perform pg_temp.check_assert((select subtotal = 1000000 and discount = 100000 and shipping_fee = 30000 and total = 930000 and status = 'pending' and payment_status = 'unpaid' and coupon_code = 'CHECK10' and shipping_address ->> 'district' = '' from public.orders where id = placed_order), 'Authoritative order totals and address snapshot');
  perform pg_temp.check_assert((select quantity = 2 and unit_price = 500000 and product_name = 'Original product' and image = '/images/elite-socks.jpg' from public.order_items where order_id = placed_order), 'Immutable item snapshots');
  perform pg_temp.check_assert((select stock = 8 from public.product_variants where id = 'f0000000-0000-4000-8000-000000000301'), 'Checkout decrements stock');
  perform pg_temp.check_assert(pg_temp.buy('b0000000-0000-4000-8000-000000000001', 2, ' check10 ') = placed_order, 'Equivalent idempotent replay');
  perform pg_temp.expect_error('select pg_temp.buy(''b0000000-0000-4000-8000-000000000001'', 1, ''CHECK10'')', 'different checkout details');
  perform pg_temp.expect_error('select public.checkout(''[{"variant_id":"f0000000-0000-4000-8000-000000000301","quantity":2}]'',pg_temp.shipping_address(),''cod'',''CHECK10'',''Acceptance check'',''b0000000-0000-4000-8000-000000000001'',940000)', 'different checkout details');
  perform pg_temp.expect_error('update public.orders set total = 1', 'permission denied');
  perform pg_temp.expect_error('delete from public.orders', 'permission denied');
  perform pg_temp.expect_error('insert into public.orders default values', 'permission denied');
  perform pg_temp.expect_error('update public.order_items set unit_price = 1', 'permission denied');
  perform pg_temp.expect_error(format('select public.admin_update_order(%L,''confirmed'',''unpaid'')', placed_order), 'Active admin');
end;
$$;
reset role;
select pg_temp.check_assert((select used_count = 1 from public.coupons where code = 'CHECK10'), 'Replay consumes coupon once');
select pg_temp.check_assert((select count(*) = 1 from public.newsletter_subscriptions where email = 'someone@example.com'), 'Newsletter normalization and deduplication');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000002', true);
select pg_temp.check_assert((select count(*) = 0 from public.orders where id in (select id from test_orders)), 'Other orders hidden');
select pg_temp.check_assert((select count(*) = 0 from public.order_items where order_id in (select id from test_orders)), 'Other order items hidden');
select pg_temp.check_assert((select count(*) = 0 from public.addresses where user_id = 'a0000000-0000-4000-8000-000000000001'), 'Other addresses hidden');
select pg_temp.expect_error(format('select public.cancel_order(%L)', (select id from test_orders where label = 'main')), 'not found or access denied');
insert into test_orders values ('same_request_other_user', pg_temp.buy('b0000000-0000-4000-8000-000000000001'));
select pg_temp.check_assert((select count(distinct id) = 2 from test_orders), 'Request IDs scoped per user');
select public.cancel_order((select id from test_orders where label = 'same_request_other_user'));
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000001', true);
select public.cancel_order((select id from test_orders where label = 'main'));
select public.cancel_order((select id from test_orders where label = 'main'));
select pg_temp.check_assert((select stock = 10 from public.product_variants where id = 'f0000000-0000-4000-8000-000000000301'), 'Repeated cancellation restores stock exactly once');
select pg_temp.check_assert(pg_temp.buy('b0000000-0000-4000-8000-000000000001', 2, 'CHECK10') = (select id from test_orders where label = 'main'), 'Replay of cancelled order cannot create new order');
insert into test_orders values ('threshold', pg_temp.buy('b0000000-0000-4000-8000-000000000002', 3, 'CHECK10'));
select pg_temp.check_assert((select subtotal = 1500000 and shipping_fee = 0 and discount = 150000 and total = 1350000 from public.orders where id = (select id from test_orders where label = 'threshold')), 'Free shipping uses pre-discount subtotal at exact threshold');
select pg_temp.expect_error('select public.preview_coupon(''CHECK10'', 500000)', 'unavailable');
select pg_temp.expect_error('select pg_temp.buy(gen_random_uuid(), 1, ''CHECK10'')', 'unavailable');
insert into test_orders values ('fixed', pg_temp.buy('b0000000-0000-4000-8000-000000000003', 1, 'CHECKFIX'));
select pg_temp.check_assert((select discount = 500000 and total = 30000 from public.orders where id = (select id from test_orders where label = 'fixed')), 'Fixed coupon cannot discount shipping or create negative total');
insert into test_orders values ('bank', pg_temp.buy('b0000000-0000-4000-8000-000000000004', 1, '', 'bank_transfer'));
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000003', true);
do $$
declare
  cod_order uuid := (select id from test_orders where label = 'threshold');
  bank_order uuid := (select id from test_orders where label = 'bank');
begin
  perform pg_temp.check_assert((select count(*) = 4 from public.profiles where id::text like 'a0000000%'), 'Admin sees users');
  perform pg_temp.expect_error('update public.profiles set role = ''user'' where id = auth.uid()', 'permission denied');
  perform pg_temp.expect_error('update public.coupons set used_count = 0 where code = ''CHECK10''', 'permission denied');
  perform pg_temp.expect_error('insert into public.coupons(code,discount_type,amount,used_count) values (''BYPASS'',''percent'',10,0)', 'permission denied');
  perform pg_temp.expect_error('update public.product_variants set stock = -1 where id = ''f0000000-0000-4000-8000-000000000301''', 'check constraint');
  perform pg_temp.expect_error('delete from public.product_variants where id = ''f0000000-0000-4000-8000-000000000301''', 'foreign key');
  perform pg_temp.expect_error('delete from public.products where id = ''f0000000-0000-4000-8000-000000000201''', 'foreign key');
  update public.products set name = 'Renamed product', price = 600000, images = array['/images/strength-gear.jpg'] where id = 'f0000000-0000-4000-8000-000000000201';
  perform pg_temp.check_assert((select unit_price = 500000 and product_name = 'Original product' and image = '/images/elite-socks.jpg' from public.order_items where order_id = cod_order), 'Catalog edits do not change history');
  perform pg_temp.expect_error(format('select public.admin_update_order(%L,''shipping'',''unpaid'')', cod_order), 'Invalid order transition');
  perform public.admin_update_order(cod_order, 'confirmed', 'unpaid');
  perform pg_temp.expect_error(format('select public.cancel_order(%L)', cod_order), 'pending unpaid');
  perform public.admin_update_order(cod_order, 'shipping', 'unpaid');
  perform pg_temp.expect_error(format('select public.admin_update_order(%L,''completed'',''unpaid'')', cod_order), 'Payment must be verified');
  perform public.admin_update_order(cod_order, 'completed', 'paid');
  perform pg_temp.expect_error(format('select public.admin_update_order(%L,''completed'',''unpaid'')', cod_order), 'cannot be reversed');
  perform pg_temp.expect_error(format('select public.admin_update_order(%L,''confirmed'',''unpaid'')', bank_order), 'Payment must be verified');
  perform public.admin_update_order(bank_order, 'pending', 'paid');
  perform pg_temp.expect_error(format('select public.cancel_order(%L)', bank_order), 'pending unpaid');
  perform public.admin_update_order(bank_order, 'confirmed', 'paid');
  perform public.admin_update_order(bank_order, 'shipping', 'paid');
  perform public.admin_update_order(bank_order, 'completed', 'paid');
  perform public.admin_update_order((select id from test_orders where label = 'fixed'), 'cancelled', 'unpaid');
  perform public.admin_update_order((select id from test_orders where label = 'fixed'), 'cancelled', 'unpaid');
  perform pg_temp.expect_error(format('select public.admin_update_order(%L,''pending'',''unpaid'')', (select id from test_orders where label = 'fixed')), 'terminal');
  perform pg_temp.expect_error('select public.admin_update_user(auth.uid(), ''user'', true)', 'last active admin');
  perform pg_temp.expect_error('select public.admin_update_user(auth.uid(), ''admin'', false)', 'last active admin');
  perform public.admin_update_user('a0000000-0000-4000-8000-000000000002', 'admin', true);
  perform public.admin_update_user(auth.uid(), 'user', true);
  perform pg_temp.check_assert(not private.is_admin(), 'Self-demotion allowed with another active admin');
end;
$$;
reset role;
select pg_temp.check_assert((select stock = 6 from public.product_variants where id = 'f0000000-0000-4000-8000-000000000301'), 'Completed orders remain deducted; cancellations restore once');
select pg_temp.check_assert((select used_count = 2 from public.coupons where code = 'CHECK10'), 'Cancelled checkout retains historical coupon use');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000001', true);
select pg_temp.check_assert(pg_temp.buy('b0000000-0000-4000-8000-000000000001', 2, 'CHECK10') = (select id from test_orders where label = 'main'), 'Replay succeeds after price change and coupon exhaustion');
select pg_temp.expect_error('select pg_temp.buy(gen_random_uuid())', 'total changed');
select pg_temp.check_assert((select stock = 6 from public.product_variants where id = 'f0000000-0000-4000-8000-000000000301'), 'Price mismatch does not decrement stock');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000002', true);
select pg_temp.check_assert((select count(*) = 1 from public.newsletter_subscriptions where email = 'someone@example.com'), 'Admin can read subscriptions');
select public.admin_update_user('a0000000-0000-4000-8000-000000000001', 'user', false);
insert into storage.objects(bucket_id, name) values ('product-images', 'acceptance/admin.jpg');
select pg_temp.check_assert((select count(*) = 1 from storage.objects where bucket_id = 'product-images' and name = 'acceptance/admin.jpg'), 'Admin image metadata insert');
delete from storage.objects where bucket_id = 'product-images' and name = 'acceptance/admin.jpg';
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000001', true);
select pg_temp.check_assert((select not is_active from public.profiles where id = auth.uid()), 'Disabled user can see own account status');
select pg_temp.check_assert((select count(*) = 0 from public.orders where id in (select id from test_orders)), 'Disabled user loses order access');
select pg_temp.check_assert((select count(*) = 0 from public.addresses where user_id = auth.uid()), 'Disabled user loses address access');
select pg_temp.expect_error('select pg_temp.buy(gen_random_uuid())', 'Active authentication required');
select pg_temp.expect_error('select pg_temp.buy(''b0000000-0000-4000-8000-000000000001'',2,''CHECK10'')', 'Active authentication required');
select pg_temp.expect_error('select public.update_my_profile(''Disabled'','''')', 'Active authentication required');
select pg_temp.expect_error('select public.subscribe_newsletter(''disabled@example.com'')', 'Active authentication required');
select pg_temp.expect_error('select public.preview_coupon(''CHECKFIX'',500000)', 'Active authentication required');
select pg_temp.expect_error(format('select public.cancel_order(%L)', (select id from test_orders where label = 'main')), 'Active authentication required');
select pg_temp.expect_error('insert into storage.objects(bucket_id,name) values (''product-images'',''acceptance/forbidden.jpg'')', 'row-level security');
reset role;

select pg_temp.expect_error('delete from auth.users where id = ''a0000000-0000-4000-8000-000000000001''', 'foreign key');
select pg_temp.check_assert(not exists(
  select 1 from pg_proc as procedure join pg_namespace as namespace on namespace.oid = procedure.pronamespace
  where namespace.nspname in ('public','private') and procedure.prosecdef
    and (procedure.proconfig is null or not ('search_path=""' = any(procedure.proconfig)))
), 'Every security definer has an empty search_path');
select 'All database acceptance checks passed; fixture changes will be rolled back.' as result;
rollback;
