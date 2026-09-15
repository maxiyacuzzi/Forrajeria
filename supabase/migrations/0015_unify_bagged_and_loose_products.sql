-- One-time catalog fix for "Mundo Animal Rio 1": after the separate "(Granel)"
-- listings were deleted (they were disconnected from the matching bagged
-- product's stock — see migration 0008's notes), the remaining bagged products
-- that used to have a loose/granel counterpart are converted here to
-- 'fraccionable', so one stock count covers both selling the whole bag and
-- selling loose kg from it. bag_price keeps the bolsa price that was already
-- in sale_price; sale_price becomes the per-kg price the deleted granel
-- listings used to carry (recovered from migration 0008).
--
-- Guarded by org name like 0008/0010, so it's a no-op anywhere that org
-- doesn't exist (local dev, other orgs, CI).

do $$
declare
  v_org_id uuid;
begin
  select id into v_org_id from public.organizations where name = 'Mundo Animal Rio 1';

  if v_org_id is null then
    return;
  end if;

  update public.products p
  set bag_price = p.sale_price,
      sale_price = v.price_per_kg,
      unit_type = 'fraccionable',
      sale_unit_label = 'kg',
      conversion_factor = v.bag_kg
  from (
    values
      ('Jaspe cachorro', 15, 2199.99),
      ('Agility urinary', 10, 6199.99),
      ('Gati', 15, 3199.99),
      ('Ken-L Gato', 7.5, 4999.99),
      ('Excellent urinary', 7.5, 9999.99),
      ('Whiskas Gatitos', 10, 5399.99),
      ('Sabrositos Mix', 10, 2999.99),
      ('Vagoneta Gato', 10, 3199.99),
      ('Jaspe Gato', 10, 2999.99),
      ('Zimpi', 15, 1999.99),
      ('Ken-L Cachorro', 18, 2799.99),
      ('Dog Selection Cachorro', 21, 2499.99),
      ('Dog Selection Premium', 15, 2999.99),
      ('Jaspe Adulto', 20, 1999.99),
      ('Ken-L Adulto', 18, 2599.99),
      ('Dog Selection Adulto', 21, 2299.99),
      ('Bacan', 21, 1499.99),
      ('Ganacan', 25, 1099.99),
      ('Performance Adulto Weight control', 15, 4399.99),
      ('Pacha Mix', 22, 1399.99),
      ('Jaspe Adulto Mordida Pequeña', 20, 1999.99),
      ('Dog Selection Mordida pequeña', 15, 2399.99),
      ('Vagoneta Gourmet', 20, 1799.99),
      ('Performance Junior', 15, 5499.99),
      ('Royal canin mini adult', 7.5, 11999.99),
      ('Ganacan cachorro', 15, 1799.99)
  ) as v(name, bag_kg, price_per_kg)
  where p.org_id = v_org_id and p.name = v.name;
end $$;
