-- Fraccionable products need two prices: one for the whole closed bag
-- (purchase_unit_label) and one for loose sales by weight (sale_unit_label,
-- already stored in sale_price). bag_price is null for 'simple' products,
-- where sale_price alone already covers the single unit they're sold in.

alter table public.products
  add column bag_price numeric(14, 2);
