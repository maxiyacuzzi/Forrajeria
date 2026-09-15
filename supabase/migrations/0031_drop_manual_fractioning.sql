-- Manual fraccionamiento (open/close a bag with measured shrinkage) is gone —
-- bags now only open automatically during a sale (see create_sale() in
-- 0023_auto_open_bags_on_sale.sql), which doesn't use this table at all.

drop function if exists public.open_fractioning(uuid, numeric);
drop function if exists public.close_fractioning(uuid, numeric);
drop table if exists public.fractionings;
