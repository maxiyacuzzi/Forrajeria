-- "Dogui cachorro" was missed by migration 0015 (parsing artifact while building
-- that migration, unrelated to the data itself). Converts it the same way: bag
-- price preserved, sale_price becomes the per-kg price its deleted granel
-- listing used to carry (2299.99, from migration 0008).

do $$
declare
  v_org_id uuid;
begin
  select id into v_org_id from public.organizations where name = 'Mundo Animal Rio 1';

  if v_org_id is null then
    return;
  end if;

  update public.products
  set bag_price = sale_price,
      sale_price = 2299.99,
      unit_type = 'fraccionable',
      sale_unit_label = 'kg',
      conversion_factor = 21
  where org_id = v_org_id and name = 'Dogui cachorro';
end $$;
