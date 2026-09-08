\set ON_ERROR_STOP on
begin;
set local statement_timeout = '15s';
set local lock_timeout = '10s';
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c0000000-0000-4000-8000-000000000001', true);
select public.cancel_order((select id from public.orders where request_id = 'c0000000-0000-4000-8000-000000000504'));
select pg_sleep(:'hold_seconds'::numeric);
commit;
