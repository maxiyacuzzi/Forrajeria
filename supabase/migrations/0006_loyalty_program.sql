-- Loyalty program: every 10 sales earn the customer a 50% discount on their
-- 11th sale, then the count starts over. The streak requires a purchase at
-- least every 40 days — a longer gap resets the count back to zero.

alter table public.customers
  add column purchase_streak smallint not null default 0
    check (purchase_streak >= 0 and purchase_streak <= 10),
  add column last_purchase_at timestamptz;

alter table public.sales
  add column subtotal_amount numeric(14, 2) not null default 0,
  add column discount_amount numeric(14, 2) not null default 0,
  add column is_loyalty_reward boolean not null default false;

create or replace function public.create_sale(p_customer_id uuid, p_items jsonb, p_note text default null)
returns public.sales
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid := public.auth_org_id();
  v_customer public.customers;
  v_sale public.sales;
  v_item jsonb;
  v_product public.products;
  v_quantity numeric(14, 3);
  v_unit text;
  v_unit_price numeric(14, 2);
  v_subtotal numeric(14, 2) := 0;
  v_discount numeric(14, 2) := 0;
  v_is_reward boolean;
begin
  if public.auth_role() not in ('owner', 'vendedor', 'deposito') then
    raise exception 'No tiene permiso para registrar ventas';
  end if;

  select * into v_customer
  from public.customers
  where id = p_customer_id and org_id = v_org_id
  for update;

  if not found then
    raise exception 'Cliente no encontrado';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta debe tener al menos un producto';
  end if;

  -- A gap of more than 40 days since the last purchase breaks the streak.
  if v_customer.last_purchase_at is not null
     and v_customer.last_purchase_at < now() - interval '40 days' then
    v_customer.purchase_streak := 0;
  end if;

  v_is_reward := v_customer.purchase_streak >= 10;

  insert into public.sales (org_id, customer_id, note, created_by, is_loyalty_reward)
  values (v_org_id, p_customer_id, p_note, auth.uid(), v_is_reward)
  returning * into v_sale;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_unit := v_item ->> 'unit';
    v_quantity := (v_item ->> 'quantity')::numeric;
    v_unit_price := coalesce((v_item ->> 'unit_price')::numeric, 0);

    if v_unit not in ('purchase', 'sale') then
      raise exception 'Unidad inválida: %', v_unit;
    end if;

    if v_quantity <= 0 then
      raise exception 'La cantidad debe ser mayor a cero';
    end if;

    select * into v_product
    from public.products
    where id = (v_item ->> 'product_id')::uuid and org_id = v_org_id
    for update;

    if not found then
      raise exception 'Producto no encontrado';
    end if;

    if (v_unit = 'purchase' and v_product.stock_qty < v_quantity)
       or (v_unit = 'sale' and v_product.stock_open_qty < v_quantity) then
      raise exception 'Stock insuficiente para %', v_product.name;
    end if;

    insert into public.sale_items (sale_id, product_id, unit, quantity, unit_price)
    values (v_sale.id, v_product.id, v_unit, v_quantity, v_unit_price);

    insert into public.stock_movements (org_id, product_id, type, unit, quantity, reference_id, created_by)
    values (v_org_id, v_product.id, 'egreso_venta', v_unit, -v_quantity, v_sale.id, auth.uid());

    v_subtotal := v_subtotal + (v_quantity * v_unit_price);
  end loop;

  if v_is_reward then
    v_discount := round(v_subtotal * 0.5, 2);
  end if;

  update public.sales
  set subtotal_amount = v_subtotal,
      discount_amount = v_discount,
      total_amount = v_subtotal - v_discount
  where id = v_sale.id
  returning * into v_sale;

  update public.customers
  set purchase_streak = case when v_is_reward then 0 else v_customer.purchase_streak + 1 end,
      last_purchase_at = now()
  where id = p_customer_id;

  return v_sale;
end;
$$;
