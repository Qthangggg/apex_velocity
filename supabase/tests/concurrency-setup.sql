\set ON_ERROR_STOP on
begin;
insert into auth.users(id, email, raw_user_meta_data) values
  ('c0000000-0000-4000-8000-000000000001', 'race-one@shop-test.invalid', '{}'),
  ('c0000000-0000-4000-8000-000000000002', 'race-two@shop-test.invalid', '{}'),
  ('c0000000-0000-4000-8000-000000000003', 'race-admin-one@shop-test.invalid', '{}'),
  ('c0000000-0000-4000-8000-000000000004', 'race-admin-two@shop-test.invalid', '{}');
update public.profiles set role = 'admin' where id in ('c0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000004');
insert into public.products(id, slug, name, price) values
  ('c0000000-0000-4000-8000-000000000201', 'race-product', 'Concurrency Fixture', 500000);
insert into public.product_variants(id, product_id, size, color, sku, stock) values
  ('c0000000-0000-4000-8000-000000000301', 'c0000000-0000-4000-8000-000000000201', 'M', 'Black', 'RACE-STOCK', 1),
  ('c0000000-0000-4000-8000-000000000302', 'c0000000-0000-4000-8000-000000000201', 'L', 'Black', 'RACE-COUPON-A', 2),
  ('c0000000-0000-4000-8000-000000000303', 'c0000000-0000-4000-8000-000000000201', 'XL', 'Black', 'RACE-COUPON-B', 2),
  ('c0000000-0000-4000-8000-000000000304', 'c0000000-0000-4000-8000-000000000201', 'XXL', 'Black', 'RACE-REPLAY', 5);
insert into public.coupons(id, code, discount_type, amount, max_uses) values
  ('c0000000-0000-4000-8000-000000000401', 'RACEONCE', 'percent', 10, 1);
commit;
