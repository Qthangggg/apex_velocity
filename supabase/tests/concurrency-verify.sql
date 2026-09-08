\set ON_ERROR_STOP on
do $$
begin
  if (select count(*) from public.orders where user_id::text like 'c0000000%') <> 3 then raise exception 'Race created wrong order count'; end if;
  if (select stock from public.product_variants where sku = 'RACE-STOCK') <> 0 then raise exception 'Last unit oversold'; end if;
  if (select used_count from public.coupons where code = 'RACEONCE') <> 1 then raise exception 'Coupon overused'; end if;
  if (select sum(stock) from public.product_variants where sku in ('RACE-COUPON-A','RACE-COUPON-B')) <> 3 then raise exception 'Coupon loser changed stock'; end if;
  if (select count(*) from public.orders where request_id = 'c0000000-0000-4000-8000-000000000504') <> 1 then raise exception 'Duplicate replay order'; end if;
  if (select stock from public.product_variants where sku = 'RACE-REPLAY') <> 5 then raise exception 'Cancellation restored stock more than once'; end if;
  if (select status from public.orders where request_id = 'c0000000-0000-4000-8000-000000000504') <> 'cancelled' then raise exception 'Cancellation missing'; end if;
  if (select count(*) from public.profiles where role = 'admin' and is_active) <> 1 then raise exception 'Last active admin invariant failed'; end if;
end;
$$;
select 'Concurrent stock, coupon, idempotency, cancellation, and last-admin checks passed.' as result;
