\set ON_ERROR_STOP on
begin;
set local statement_timeout = '15s';
set local lock_timeout = '10s';
set local role authenticated;
select set_config('request.jwt.claim.sub', :'user_id', true);
select public.checkout(
  jsonb_build_array(jsonb_build_object('variant_id', :'variant_id', 'quantity', 1)),
  '{"recipient":"Race Buyer","phone":"0901234567","line1":"123 Test Street","ward":"Test Ward","district":"","city":"Test City"}',
  'cod', :'coupon_code', '', :'request_id'::uuid, :'expected_total'::numeric
) as order_id;
select pg_sleep(:'hold_seconds'::numeric);
commit;
