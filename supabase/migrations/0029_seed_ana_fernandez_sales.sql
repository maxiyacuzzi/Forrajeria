-- 30 more sales for "PRUEBA Ana Fernández" (from the 0024 demo data), spread
-- across the last year, alternating baskets of 1, 2 and 4 products — so
-- Reportes/Fidelidad have a richer, more realistic single-customer history
-- to look at. Guarded by org + customer name, so it's a no-op anywhere that
-- doesn't exist (local dev, other orgs, CI, or if the 0024 seed was never
-- applied/was cleaned up).

create function pg_temp.seed_multi_sale(
  p_customer uuid, p_items jsonb, p_payment_method public.payment_method, p_days_ago int
) returns void
language plpgsql
as $$
declare
  v_result public.sales;
begin
  v_result := public.create_sale(p_customer, p_items, 'PRUEBA', p_payment_method);

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
  v_ana uuid;
  v_supplier1 uuid;

  v_perro uuid;
  v_gato uuid;
  v_collar uuid;
  v_juguete uuid;

  v_perro_price numeric;
  v_gato_price numeric;
  v_collar_price numeric;
  v_juguete_price numeric;

  v_products uuid[];
  v_prices numeric[];

  v_i int;
  v_size int;
  v_days_ago int;
  v_items jsonb;
  v_payment_methods public.payment_method[] := array['efectivo', 'transferencia', 'tarjeta'];
begin
  select id into v_org_id from public.organizations where name = 'Mundo Animal Rio 1';
  if v_org_id is null then
    return;
  end if;

  select id into v_ana from public.customers where org_id = v_org_id and name = 'PRUEBA Ana Fernández';
  if v_ana is null then
    return;
  end if;

  select id into v_owner_id from public.profiles where org_id = v_org_id and role = 'owner' limit 1;
  if v_owner_id is null then
    return;
  end if;

  select id into v_perro from public.products where org_id = v_org_id and name = '[PRUEBA] Alimento Perro 20kg';
  select id into v_gato from public.products where org_id = v_org_id and name = '[PRUEBA] Alimento Gato 15kg';
  select id into v_collar from public.products where org_id = v_org_id and name = '[PRUEBA] Collar para perro';
  select id into v_supplier1 from public.suppliers where org_id = v_org_id and name = 'PRUEBA Distribuidora Norte';

  if v_perro is null or v_gato is null or v_collar is null then
    return;
  end if;

  perform set_config('request.jwt.claims', json_build_object('sub', v_owner_id::text)::text, true);

  -- A 4th product so a "4 productos" basket has something real to add.
  select id into v_juguete from public.products where org_id = v_org_id and name = '[PRUEBA] Juguete para perro';
  if v_juguete is null then
    insert into public.products (
      org_id, name, unit_type, purchase_unit_label, sale_unit_label,
      cost_price, margin_suelto_pct, margin_bolsa_pct, sale_price, min_stock_alert, earns_loyalty
    ) values (
      v_org_id, '[PRUEBA] Juguete para perro', 'simple', 'unidad', 'unidad',
      1500, 55, 35, 2100, 5, false
    ) returning id into v_juguete;

    if v_supplier1 is not null then
      insert into public.product_suppliers (org_id, product_id, supplier_id)
      values (v_org_id, v_juguete, v_supplier1);
    end if;
  end if;

  -- Top up stock generously so 30 more sales never hit "stock insuficiente".
  insert into public.stock_movements (org_id, product_id, type, unit, quantity, note, created_by, created_at) values
    (v_org_id, v_perro, 'ingreso_compra', 'purchase', 30, 'PRUEBA', v_owner_id, now() - interval '370 days'),
    (v_org_id, v_gato, 'ingreso_compra', 'purchase', 30, 'PRUEBA', v_owner_id, now() - interval '370 days'),
    (v_org_id, v_collar, 'ingreso_compra', 'purchase', 30, 'PRUEBA', v_owner_id, now() - interval '370 days'),
    (v_org_id, v_juguete, 'ingreso_compra', 'purchase', 30, 'PRUEBA', v_owner_id, now() - interval '370 days');

  select bag_price into v_perro_price from public.products where id = v_perro;
  select bag_price into v_gato_price from public.products where id = v_gato;
  select sale_price into v_collar_price from public.products where id = v_collar;
  select sale_price into v_juguete_price from public.products where id = v_juguete;

  v_products := array[v_perro, v_gato, v_collar, v_juguete];
  v_prices := array[v_perro_price, v_gato_price, v_collar_price, v_juguete_price];

  for v_i in 0..29 loop
    v_days_ago := round(v_i * 365.0 / 29);
    v_size := case v_i % 3 when 0 then 1 when 1 then 2 else 4 end;

    if v_size = 1 then
      v_items := jsonb_build_array(
        jsonb_build_object(
          'product_id', v_products[(v_i % 4) + 1], 'unit', 'purchase', 'quantity', 1,
          'unit_price', v_prices[(v_i % 4) + 1]
        )
      );
    elsif v_size = 2 then
      v_items := jsonb_build_array(
        jsonb_build_object(
          'product_id', v_products[(v_i % 4) + 1], 'unit', 'purchase', 'quantity', 1,
          'unit_price', v_prices[(v_i % 4) + 1]
        ),
        jsonb_build_object(
          'product_id', v_products[((v_i + 2) % 4) + 1], 'unit', 'purchase', 'quantity', 1,
          'unit_price', v_prices[((v_i + 2) % 4) + 1]
        )
      );
    else
      v_items := jsonb_build_array(
        jsonb_build_object('product_id', v_perro, 'unit', 'purchase', 'quantity', 1, 'unit_price', v_perro_price),
        jsonb_build_object('product_id', v_gato, 'unit', 'purchase', 'quantity', 1, 'unit_price', v_gato_price),
        jsonb_build_object('product_id', v_collar, 'unit', 'purchase', 'quantity', 1, 'unit_price', v_collar_price),
        jsonb_build_object('product_id', v_juguete, 'unit', 'purchase', 'quantity', 1, 'unit_price', v_juguete_price)
      );
    end if;

    perform pg_temp.seed_multi_sale(
      v_ana, v_items, v_payment_methods[(v_i % 3) + 1], v_days_ago
    );
  end loop;
end $$;
