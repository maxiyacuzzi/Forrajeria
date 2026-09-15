-- Per-product markup percentages so sale_price / bag_price can be calculated
-- automatically from cost_price instead of typed in by hand. margin_suelto_pct
-- applies to loose/kg sales (fraccionable only); margin_bolsa_pct applies to
-- the whole purchase unit (bag, or the single unit for simple/no_fraccionable
-- products). Both default to the store's usual markup but are editable per
-- product for cases that need a different margin.

alter table public.products
  add column margin_suelto_pct numeric(6, 2) not null default 55,
  add column margin_bolsa_pct numeric(6, 2) not null default 35;
