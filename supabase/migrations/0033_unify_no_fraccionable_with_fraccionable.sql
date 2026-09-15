-- no_fraccionable now shares the exact same envase/kg-por-envase/dual-margin
-- pricing model as fraccionable — the only real difference left is that only
-- fraccionable can be sold loose. reference_weight (kg per unit, display-only)
-- is superseded by conversion_factor (already used the same way by
-- fraccionable), so fold any existing value into it before dropping the column.

update public.products
set conversion_factor = reference_weight
where unit_type = 'no_fraccionable' and conversion_factor is null and reference_weight is not null;

-- Recompute labels/prices for existing no_fraccionable rows with the same
-- formula the product form now uses for both types.
update public.products
set sale_unit_label = 'kg',
    purchase_unit_label =
      trim(regexp_replace(purchase_unit_label, '[\d.,].*$', '')) || ' ' || conversion_factor::text || 'kg',
    bag_price = ceil(cost_price * (1 + margin_bolsa_pct / 100) / 100) * 100,
    sale_price = ceil((cost_price / conversion_factor) * (1 + margin_suelto_pct / 100) / 100) * 100
where unit_type = 'no_fraccionable' and conversion_factor is not null and conversion_factor > 0;

alter table public.products drop column reference_weight;
