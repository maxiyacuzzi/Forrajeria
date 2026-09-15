-- Follow-up to 0033: casting numeric(14,3) straight to text kept trailing
-- zeros ("bolsa 22.000kg" instead of "bolsa 22kg"). Recompose through float8,
-- which the product form's own JS formatting never produces.

update public.products
set purchase_unit_label =
  trim(regexp_replace(purchase_unit_label, '[\d.,].*$', '')) || ' ' || conversion_factor::float8::text || 'kg'
where unit_type = 'no_fraccionable' and conversion_factor is not null and conversion_factor > 0;
