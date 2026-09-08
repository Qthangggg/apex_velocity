\set ON_ERROR_STOP on
begin;
set local statement_timeout = '15s';
set local lock_timeout = '10s';
set local role authenticated;
select set_config('request.jwt.claim.sub', :'user_id', true);
select public.admin_update_user(:'user_id'::uuid, 'user', true);
select pg_sleep(:'hold_seconds'::numeric);
commit;
