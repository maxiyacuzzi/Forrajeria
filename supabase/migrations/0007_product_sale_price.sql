-- Adds the retail/sale price as its own field, separate from cost_price.
-- Lets the sale form eventually pre-fill unit_price from the product's list price.

alter table public.products
  add column sale_price numeric(14, 2) not null default 0;
