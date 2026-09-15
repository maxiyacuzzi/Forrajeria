-- One-time demo/test data for "Mundo Animal Rio 1", requested to explore
-- reportes, fidelidad and clientes inactivos with realistic-looking content.
-- Everything is clearly tagged "PRUEBA"/"[PRUEBA]" so it's easy to find and
-- delete later. Guarded by org name, so it's a no-op anywhere that org
-- doesn't exist (local dev, other orgs, CI) — same pattern as migrations
-- 0008/0010/0015/0016.
--
-- Sales are created through create_sale() itself (not hand-built rows) so
-- stock deduction, per-product loyalty progress and pricing/discounts all go
-- through the real business logic — the only thing done manually afterwards
-- is backdating created_at (for a realistic timeline) and detaching from any
-- currently-open cash register, so none of this touches real caja
-- reconciliation. seed_sale() lives in pg_temp so it disappears with this
-- session — nothing permanent added to the schema.

create function pg_temp.seed_sale(
  p_customer uuid, p_product uuid, p_unit text, p_qty numeric,
  p_unit_price numeric, p_payment_method public.payment_method, p_days_ago int
) returns void
language plpgsql
as $$
declare
  v_result public.sales;
begin
  v_result := public.create_sale(
    p_customer,
    jsonb_build_array(
      jsonb_build_object(
        'product_id', p_product, 'unit', p_unit, 'quantity', p_qty, 'unit_price', p_unit_price
      )
    ),
    'PRUEBA',
    p_payment_method
  );

  update public.sales
  set created_at = now() - (p_days_ago || ' days')::interval,
      cash_register_id = null
  where id = v_result.id;

  update public.stock_movements
  set created_at = now() - (p_days_ago || ' days')::interval
  where reference_id = v_result.id and type = 'egreso_venta';
end;
$$;

do $$
declare
  v_org_id uuid;
  v_owner_id uuid;

  v_supplier1 uuid;
  v_supplier2 uuid;
  v_supplier3 uuid;

  v_product1 uuid; -- Alimento Perro 20kg (fraccionable)
  v_product2 uuid; -- Alimento Gato 15kg (fraccionable)
  v_product3 uuid; -- Collar (simple)

  v_customer1 uuid;
  v_customer2 uuid;
  v_customer3 uuid;
  v_customer4 uuid;
  v_customer5 uuid;
  v_customer6 uuid;
  v_customer7 uuid;
  v_customer8 uuid;
  v_customer9 uuid;

  v_expense1 uuid;
  v_expense3 uuid;
begin
  select id into v_org_id from public.organizations where name = 'Mundo Animal Rio 1';
  if v_org_id is null then
    return;
  end if;

  select id into v_owner_id from public.profiles where org_id = v_org_id and role = 'owner' limit 1;
  if v_owner_id is null then
    return;
  end if;

  -- Impersonate the org's owner for the rest of this transaction, so
  -- auth.uid()/auth_org_id()/auth_role() resolve the way they would for a
  -- real logged-in request.
  perform set_config('request.jwt.claims', json_build_object('sub', v_owner_id::text)::text, true);

  -- Proveedores
  insert into public.suppliers (org_id, name, contact_name, phone, email)
  values (v_org_id, 'PRUEBA Distribuidora Norte', 'Carlos Gómez', '+54 11 4444-1111', 'ventas@distribuidoranorte-prueba.com.ar')
  returning id into v_supplier1;

  insert into public.suppliers (org_id, name, contact_name, phone, email)
  values (v_org_id, 'PRUEBA Alimentos del Sur', 'Marta López', '+54 11 4444-2222', 'contacto@alimentossur-prueba.com.ar')
  returning id into v_supplier2;

  insert into public.suppliers (org_id, name, contact_name, phone)
  values (v_org_id, 'PRUEBA Mayorista Central', 'Jorge Fernández', '+54 11 4444-3333')
  returning id into v_supplier3;

  -- Productos (stock arranca en 0; lo suma el ingreso de mercadería de abajo)
  insert into public.products (
    org_id, name, unit_type, purchase_unit_label, sale_unit_label, conversion_factor,
    cost_price, margin_suelto_pct, margin_bolsa_pct, sale_price, bag_price, min_stock_alert
  ) values (
    v_org_id, '[PRUEBA] Alimento Perro 20kg', 'fraccionable', 'bolsa 20kg', 'kg', 20,
    200000, 55, 35, 15500, 270000, 40
  ) returning id into v_product1;

  insert into public.products (
    org_id, name, unit_type, purchase_unit_label, sale_unit_label, conversion_factor,
    cost_price, margin_suelto_pct, margin_bolsa_pct, sale_price, bag_price, min_stock_alert
  ) values (
    v_org_id, '[PRUEBA] Alimento Gato 15kg', 'fraccionable', 'bolsa 15kg', 'kg', 15,
    180000, 55, 35, 18600, 243000, 30
  ) returning id into v_product2;

  insert into public.products (
    org_id, name, unit_type, purchase_unit_label, sale_unit_label,
    cost_price, margin_suelto_pct, margin_bolsa_pct, sale_price, min_stock_alert
  ) values (
    v_org_id, '[PRUEBA] Collar para perro', 'simple', 'unidad', 'unidad',
    3000, 55, 35, 4100, 5
  ) returning id into v_product3;

  insert into public.product_suppliers (org_id, product_id, supplier_id) values
    (v_org_id, v_product1, v_supplier1),
    (v_org_id, v_product2, v_supplier2),
    (v_org_id, v_product3, v_supplier3);

  -- Ingreso de mercadería inicial (70 días atrás), vía stock_movements —
  -- el trigger apply_stock_movement ya deja stock_qty/stock_open_qty al día.
  insert into public.stock_movements (org_id, product_id, type, unit, quantity, supplier_id, unit_cost, note, created_by, created_at) values
    (v_org_id, v_product1, 'ingreso_compra', 'purchase', 20, v_supplier1, 200000, 'PRUEBA', v_owner_id, now() - interval '70 days'),
    (v_org_id, v_product1, 'ingreso_compra', 'sale', 15, v_supplier1, 10000, 'PRUEBA', v_owner_id, now() - interval '70 days'),
    (v_org_id, v_product2, 'ingreso_compra', 'purchase', 15, v_supplier2, 180000, 'PRUEBA', v_owner_id, now() - interval '68 days'),
    (v_org_id, v_product2, 'ingreso_compra', 'sale', 10, v_supplier2, 12000, 'PRUEBA', v_owner_id, now() - interval '68 days'),
    (v_org_id, v_product3, 'ingreso_compra', 'purchase', 30, v_supplier3, 3000, 'PRUEBA', v_owner_id, now() - interval '65 days');

  -- Gastos de esos ingresos, con distintos estados de pago para probar
  -- Gastos / cuenta corriente de proveedores.
  insert into public.expenses (org_id, supplier_id, description, amount, paid_amount, payment_method, created_by, created_at)
  values (v_org_id, v_supplier1, 'PRUEBA Mercadería de Distribuidora Norte', 4150000, 2000000, 'efectivo', v_owner_id, now() - interval '70 days')
  returning id into v_expense1;
  insert into public.expense_payments (org_id, expense_id, amount, payment_method, note, created_by, created_at)
  values (v_org_id, v_expense1, 2000000, 'efectivo', 'PRUEBA', v_owner_id, now() - interval '70 days');

  insert into public.expenses (org_id, supplier_id, description, amount, paid_amount, payment_method, created_by, created_at)
  values (v_org_id, v_supplier2, 'PRUEBA Mercadería de Alimentos del Sur', 2820000, 0, 'efectivo', v_owner_id, now() - interval '68 days');

  insert into public.expenses (org_id, supplier_id, description, amount, paid_amount, payment_method, created_by, created_at)
  values (v_org_id, v_supplier3, 'PRUEBA Mercadería de Mayorista Central', 90000, 90000, 'transferencia', v_owner_id, now() - interval '65 days')
  returning id into v_expense3;
  insert into public.expense_payments (org_id, expense_id, amount, payment_method, note, created_by, created_at)
  values (v_org_id, v_expense3, 90000, 'transferencia', 'PRUEBA', v_owner_id, now() - interval '65 days');

  -- Clientes
  insert into public.customers (org_id, dni, name, address, whatsapp) values
    (v_org_id, '30111222', 'PRUEBA Juan Pérez', 'Av. Rivadavia 1234', '+54 9 11 5555-0001') returning id into v_customer1;
  insert into public.customers (org_id, dni, name, address, whatsapp) values
    (v_org_id, '28222333', 'PRUEBA María González', 'San Martín 456', '+54 9 11 5555-0002') returning id into v_customer2;
  insert into public.customers (org_id, dni, name, address, whatsapp) values
    (v_org_id, '25333444', 'PRUEBA Carlos Rodríguez', 'Belgrano 789', '+54 9 11 5555-0003') returning id into v_customer3;
  insert into public.customers (org_id, dni, name, address, whatsapp) values
    (v_org_id, '33444555', 'PRUEBA Ana Fernández', 'Mitre 321', '+54 9 11 5555-0004') returning id into v_customer4;
  insert into public.customers (org_id, dni, name, address) values
    (v_org_id, '27555666', 'PRUEBA Luis Martínez', 'Sarmiento 654') returning id into v_customer5;
  insert into public.customers (org_id, dni, name, address, whatsapp) values
    (v_org_id, '31666777', 'PRUEBA Laura Sánchez', 'Alem 987', '+54 9 11 5555-0006') returning id into v_customer6;
  insert into public.customers (org_id, dni, name, address, whatsapp) values
    (v_org_id, '26777888', 'PRUEBA Diego Torres', 'Moreno 159', '+54 9 11 5555-0007') returning id into v_customer7;
  insert into public.customers (org_id, dni, name, address, whatsapp) values
    (v_org_id, '32888999', 'PRUEBA Sofía Ramírez', 'Lavalle 753', '+54 9 11 5555-0008') returning id into v_customer8;
  insert into public.customers (org_id, dni, name, address, whatsapp) values
    (v_org_id, '29999000', 'PRUEBA Roberto Díaz', 'Corrientes 246', '+54 9 11 5555-0009') returning id into v_customer9;

  -- Ventas, repartidas en el tiempo.
  perform pg_temp.seed_sale(v_customer1, v_product1, 'purchase', 1, 270000, 'efectivo', 55);
  perform pg_temp.seed_sale(v_customer1, v_product1, 'sale', 5, 15500, 'transferencia', 35);
  perform pg_temp.seed_sale(v_customer1, v_product1, 'purchase', 1, 270000, 'efectivo', 10);

  perform pg_temp.seed_sale(v_customer2, v_product2, 'purchase', 1, 243000, 'efectivo', 40);
  perform pg_temp.seed_sale(v_customer2, v_product3, 'purchase', 1, 4100, 'tarjeta', 20);
  perform pg_temp.seed_sale(v_customer2, v_product2, 'sale', 3, 18600, 'efectivo', 3);

  perform pg_temp.seed_sale(v_customer3, v_product3, 'purchase', 2, 4100, 'efectivo', 25);
  perform pg_temp.seed_sale(v_customer3, v_product1, 'purchase', 1, 270000, 'transferencia', 5);

  perform pg_temp.seed_sale(v_customer4, v_product2, 'purchase', 1, 243000, 'efectivo', 15);
  perform pg_temp.seed_sale(v_customer4, v_product1, 'sale', 2, 15500, 'efectivo', 2);

  perform pg_temp.seed_sale(v_customer5, v_product3, 'purchase', 1, 4100, 'efectivo', 12);

  perform pg_temp.seed_sale(v_customer6, v_product1, 'purchase', 1, 270000, 'tarjeta', 8);
  perform pg_temp.seed_sale(v_customer6, v_product3, 'purchase', 1, 4100, 'efectivo', 1);

  -- Cliente inactivo: una sola compra hace 60 días, nada más.
  perform pg_temp.seed_sale(v_customer7, v_product2, 'purchase', 1, 243000, 'efectivo', 60);

  -- Cliente con premio de fidelidad completo en Collar (objetivo: 10 unidades).
  perform pg_temp.seed_sale(v_customer8, v_product3, 'purchase', 3, 4100, 'efectivo', 45);
  perform pg_temp.seed_sale(v_customer8, v_product3, 'purchase', 4, 4100, 'efectivo', 30);
  perform pg_temp.seed_sale(v_customer8, v_product3, 'purchase', 3, 4100, 'efectivo', 15);
  perform pg_temp.seed_sale(v_customer8, v_product3, 'purchase', 1, 4100, 'efectivo', 2); -- esta sale con 50% off

  -- Cliente con premio de fidelidad PENDIENTE (llegó a 10/10 y todavía no lo usó).
  perform pg_temp.seed_sale(v_customer9, v_product3, 'purchase', 6, 4100, 'efectivo', 20);
  perform pg_temp.seed_sale(v_customer9, v_product3, 'purchase', 4, 4100, 'efectivo', 6);
end $$;
