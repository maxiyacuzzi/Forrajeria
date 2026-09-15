-- One-time catalog import for "Mundo Animal Rio 1", from their WooCommerce product
-- export (Exportacion-productos-09-09-26.xlsx). This is tenant data, not schema, so
-- it's guarded by organization name and becomes a no-op everywhere that org doesn't
-- exist (local dev, other orgs, CI) — safe to keep alongside the schema migrations.
--
-- Every row is imported as an independent 'simple' product (stock starts at 0, to be
-- loaded via a stock adjustment): the sheet's "(Granel)" rows are sold loose by the
-- kilo (purchase/sale unit "kg"), the rest are sold as a whole bag of the labeled
-- weight ("bolsa Xkg"). The source spreadsheet's "Precio" is a retail price, loaded
-- into the new sale_price column — cost_price is left at 0 to be filled in later.
--
-- One category was corrected from the source data: "Dog Selection Cachorro" (21kg
-- bag) was miscategorized as "Gato > Cachorro" in the export despite being a dog
-- food line (matches its own "(Granel)" counterpart, filed under Perro > Cachorro);
-- imported here as Perro > Cachorro.

do $$
declare
  v_org_id uuid;
begin
  select id into v_org_id from public.organizations where name = 'Mundo Animal Rio 1';

  if v_org_id is null then
    return;
  end if;

  insert into public.product_categories (org_id, name)
  values
    (v_org_id, 'Balanceado > Gato > Cachorro'),
    (v_org_id, 'Balanceado > Gato > Castrado-Urinary'),
    (v_org_id, 'Balanceado > Gato > Adulto'),
    (v_org_id, 'Balanceado > Perro > Cachorro'),
    (v_org_id, 'Balanceado > Perro > Adulto'),
    (v_org_id, 'Balanceado > Perro > Adulto > Mordida pequeña')
  on conflict (org_id, name) do nothing;

  insert into public.products (
    org_id, name, category_id, unit_type, purchase_unit_label, sale_unit_label, sale_price, cost_price
  )
  select v_org_id, p.name, c.id, 'simple', p.unit_label, p.unit_label, p.sale_price, 0
  from (
    values
      -- Granel (sueltos por kg)
      ('Vagoneta Gatitos (Granel)', 'Balanceado > Gato > Cachorro', 'kg', 3199.99),
      ('Whiskas Gatitos (Granel)', 'Balanceado > Gato > Cachorro', 'kg', 5399.99),
      ('Cat Chow Urinary (Granel)', 'Balanceado > Gato > Castrado-Urinary', 'kg', 6999.99),
      ('Agility Urinary (Granel)', 'Balanceado > Gato > Castrado-Urinary', 'kg', 6199.99),
      ('Excellent Urinary (Granel)', 'Balanceado > Gato > Castrado-Urinary', 'kg', 9999.99),
      ('Raza (Granel)', 'Balanceado > Gato > Adulto', 'kg', 2799.99),
      ('Excellent (Granel)', 'Balanceado > Gato > Adulto', 'kg', 7999.99),
      ('Cat Chow (Granel)', 'Balanceado > Gato > Adulto', 'kg', 5499.99),
      ('Whiskas (Granel)', 'Balanceado > Gato > Adulto', 'kg', 5399.99),
      ('Ken-L (Granel)', 'Balanceado > Gato > Adulto', 'kg', 4999.99),
      ('Gati (Granel)', 'Balanceado > Gato > Adulto', 'kg', 3199.99),
      ('Jaspe (Granel)', 'Balanceado > Gato > Adulto', 'kg', 2999.99),
      ('Sabrosito Mix (Granel)', 'Balanceado > Gato > Adulto', 'kg', 2999.99),
      ('Sabrosito Pescado (Granel)', 'Balanceado > Gato > Adulto', 'kg', 2999.99),
      ('Zimpi (Granel)', 'Balanceado > Gato > Adulto', 'kg', 1999.99),
      ('Vagoneta cachorro (Granel)', 'Balanceado > Perro > Cachorro', 'kg', 1999.99),
      ('Royal Canin Mini Puppy (Granel)', 'Balanceado > Perro > Cachorro', 'kg', 9999.99),
      ('Performance cachorro (Granel)', 'Balanceado > Perro > Cachorro', 'kg', 5499.99),
      ('Ken-L cachorro (Granel)', 'Balanceado > Perro > Cachorro', 'kg', 2799.99),
      ('Dogui cachorro (Granel)', 'Balanceado > Perro > Cachorro', 'kg', 2299.99),
      ('Dog Selection Premiun Cachorro (Granel)', 'Balanceado > Perro > Cachorro', 'kg', 2999.99),
      ('Dog Selection Cachorro (Granel)', 'Balanceado > Perro > Cachorro', 'kg', 2499.99),
      ('Jaspe Cachorro (Granel)', 'Balanceado > Perro > Cachorro', 'kg', 2199.99),
      ('Ganacan Cachorro (Granel)', 'Balanceado > Perro > Cachorro', 'kg', 1799.99),
      ('Dog Chow Adulto (Granel)', 'Balanceado > Perro > Adulto', 'kg', 2999.99),
      ('Royal Canin Mini Adult (Granel)', 'Balanceado > Perro > Adulto', 'kg', 11999.99),
      ('Performance Adulto Weight Control (Granel)', 'Balanceado > Perro > Adulto', 'kg', 4399.99),
      ('Pacha Adulto (Granel)', 'Balanceado > Perro > Adulto', 'kg', 1399.99),
      ('Ken-L Adulto (Granel)', 'Balanceado > Perro > Adulto', 'kg', 2599.99),
      ('Ganacan Adulto (Granel)', 'Balanceado > Perro > Adulto', 'kg', 1099.99),
      ('Bacan Adulto (Granel)', 'Balanceado > Perro > Adulto', 'kg', 1499.99),
      ('Vagoneta Adulto (Granel)', 'Balanceado > Perro > Adulto', 'kg', 1799.99),
      ('Jaspe Adulto Mordida Pequeña (Granel)', 'Balanceado > Perro > Adulto > Mordida pequeña', 'kg', 1999.99),
      ('Jaspe Adulto (Granel)', 'Balanceado > Perro > Adulto', 'kg', 1999.99),
      ('Dogui Adulto (Granel)', 'Balanceado > Perro > Adulto', 'kg', 2199.99),
      ('Dog Selection Adulto Mordida Pequeña (Granel)', 'Balanceado > Perro > Adulto > Mordida pequeña', 'kg', 2399.99),
      ('Dog Selection Adulto (Granel)', 'Balanceado > Perro > Adulto', 'kg', 2299.99),

      -- Bolsas cerradas (por peso)
      ('Vagoneta Gato', 'Balanceado > Gato > Cachorro', 'bolsa 10kg', 29999.99),
      ('Jaspe Gato', 'Balanceado > Gato > Adulto', 'bolsa 10kg', 32999.99),
      ('Jaspe Adulto Mordida Pequeña', 'Balanceado > Perro > Adulto > Mordida pequeña', 'bolsa 20kg', 33999.99),
      ('Jaspe Adulto', 'Balanceado > Perro > Adulto', 'bolsa 20kg', 33999.99),
      ('Ken-L Cachorro', 'Balanceado > Perro > Cachorro', 'bolsa 18kg', 44999.99),
      ('Ken-L Adulto', 'Balanceado > Perro > Adulto', 'bolsa 18kg', 43999.99),
      ('Dog Selection Adulto', 'Balanceado > Perro > Adulto', 'bolsa 21kg', 43999.99),
      ('Dog Selection Cachorro', 'Balanceado > Perro > Cachorro', 'bolsa 21kg', 44999.99),
      ('Bacan', 'Balanceado > Perro > Adulto', 'bolsa 21kg', 26999.99),
      ('Zimpi', 'Balanceado > Gato > Adulto', 'bolsa 15kg', 25999.99),
      ('Balancin', 'Balanceado > Perro > Adulto', 'bolsa 15kg', 15999.99),
      ('Dogui cachorro', 'Balanceado > Perro > Cachorro', 'bolsa 21kg', 47999.99),
      ('Jaspe premium', 'Balanceado > Perro > Adulto', 'bolsa 15kg', 28000),
      ('Capitan adulto', 'Balanceado > Perro > Adulto', 'bolsa 22kg', 17999.99),
      ('Ganacan cachorro', 'Balanceado > Perro > Cachorro', 'bolsa 15kg', 19999.99),
      ('Jaspe cachorro', 'Balanceado > Perro > Cachorro', 'bolsa 15kg', 29999.99),
      ('Excellent urinary', 'Balanceado > Gato > Castrado-Urinary', 'bolsa 7.5kg', 69999.99),
      ('Trocitos pescados de mar', 'Balanceado > Gato > Adulto', 'bolsa 10kg', 19500),
      ('Ken-L Gato', 'Balanceado > Gato > Adulto', 'bolsa 7.5kg', 33999.99),
      ('Royal canin mini adult', 'Balanceado > Perro > Adulto > Mordida pequeña', 'bolsa 7.5kg', 79999.99),
      ('Agility urinary', 'Balanceado > Gato > Castrado-Urinary', 'bolsa 10kg', 57999.99),
      ('Performance Junior', 'Balanceado > Perro > Cachorro', 'bolsa 15kg', 79999.99),
      ('Ganacan', 'Balanceado > Perro > Adulto', 'bolsa 25kg', 23999.99),
      ('Performance Adulto Weight control', 'Balanceado > Perro > Adulto', 'bolsa 15kg', 67999.99),
      ('Whiskas Gatitos', 'Balanceado > Gato > Cachorro', 'bolsa 10kg', 53999.99),
      ('Pacha Mix', 'Balanceado > Perro > Adulto', 'bolsa 22kg', 25999.99),
      ('Sabrositos Mix', 'Balanceado > Gato > Adulto', 'bolsa 10kg', 25999.99),
      ('Gati', 'Balanceado > Gato > Adulto', 'bolsa 15kg', 45999.99),
      ('Vagoneta Gourmet', 'Balanceado > Perro > Adulto', 'bolsa 20kg', 29999.99),
      ('Dog Selection Premium', 'Balanceado > Perro > Cachorro', 'bolsa 15kg', 45999.99),
      ('Dog Selection Light', 'Balanceado > Perro > Adulto', 'bolsa 15kg', 25000),
      ('Dog Selection Mordida pequeña', 'Balanceado > Perro > Adulto > Mordida pequeña', 'bolsa 15kg', 33999.99),
      ('Ken-L mordida pequeña', 'Balanceado > Perro > Adulto > Mordida pequeña', 'bolsa 7.5kg', 21999.99),
      ('Danke', 'Balanceado > Perro > Adulto', 'bolsa 15kg', 12000)
  ) as p(name, category_name, unit_label, sale_price)
  join public.product_categories c on c.org_id = v_org_id and c.name = p.category_name;
end $$;
