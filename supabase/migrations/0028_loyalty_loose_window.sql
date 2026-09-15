-- The streak-expiry window now depends on how the customer's last purchase
-- of that product was made: 40 days if it was a whole bag (unit 'purchase'),
-- but only 3 weeks (21 days) if it was loose/suelto (unit 'sale', by the
-- gram or kg) — loose buyers tend to come back sooner, so a shorter window
-- fits how often they'd realistically restock.

alter table public.customer_product_loyalty
  add column last_purchase_unit text check (last_purchase_unit in ('purchase', 'sale'));

-- Body is otherwise unchanged from migration 0027.
create or replace function public.create_sale(
  p_customer_id uuid,
  p_items jsonb,
  p_note text default null,
  p_payment_method public.payment_method default 'efectivo'
)
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
  v_any_reward boolean := false;
  v_cash_register_id uuid;
  v_loyalty public.customer_product_loyalty;
  v_loyalty_window interval;
  v_item_reward boolean;
  v_final_unit_price numeric(14, 2);
  v_item_discount numeric(14, 2);
  v_shortfall numeric(14, 3);
  v_bags_needed numeric(14, 3);
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

  select id into v_cash_register_id
  from public.cash_registers
  where org_id = v_org_id and status = 'open';

  insert into public.sales (
    org_id, customer_id, note, created_by, payment_method, cash_register_id
  )
  values (
    v_org_id, p_customer_id, p_note, auth.uid(), p_payment_method, v_cash_register_id
  )
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

    -- Selling loose kg short on open stock: open however many closed bags
    -- are needed, right here, instead of failing the sale.
    if v_unit = 'sale' and v_product.unit_type = 'fraccionable'
       and v_product.stock_open_qty < v_quantity and v_product.conversion_factor > 0 then
      v_shortfall := v_quantity - v_product.stock_open_qty;
      v_bags_needed := ceil(v_shortfall / v_product.conversion_factor);

      if v_product.stock_qty < v_bags_needed then
        raise exception 'Stock insuficiente para % (no hay bolsas para abrir)', v_product.name;
      end if;

      insert into public.stock_movements (org_id, product_id, type, unit, quantity, reference_id, created_by)
      values (v_org_id, v_product.id, 'fraccionamiento_apertura', 'purchase', -v_bags_needed, v_sale.id, auth.uid());

      insert into public.stock_movements (org_id, product_id, type, unit, quantity, reference_id, created_by)
      values (
        v_org_id, v_product.id, 'fraccionamiento_apertura', 'sale',
        v_bags_needed * v_product.conversion_factor, v_sale.id, auth.uid()
      );

      v_product.stock_qty := v_product.stock_qty - v_bags_needed;
      v_product.stock_open_qty := v_product.stock_open_qty + v_bags_needed * v_product.conversion_factor;
    end if;

    if (v_unit = 'purchase' and v_product.stock_qty < v_quantity)
       or (v_unit = 'sale' and v_product.stock_open_qty < v_quantity) then
      raise exception 'Stock insuficiente para %', v_product.name;
    end if;

    v_final_unit_price := v_unit_price;
    v_item_discount := 0;

    if v_product.earns_loyalty then
      select * into v_loyalty
      from public.customer_product_loyalty
      where customer_id = p_customer_id and product_id = v_product.id
      for update;

      if not found then
        insert into public.customer_product_loyalty (org_id, customer_id, product_id)
        values (v_org_id, p_customer_id, v_product.id)
        returning * into v_loyalty;
      end if;

      -- A gap without buying THIS product resets only its own progress — the
      -- allowed gap is 40 days if their last purchase was a whole bag, or
      -- just 3 weeks if it was loose/suelto.
      v_loyalty_window := case
        when v_loyalty.last_purchase_unit = 'sale' then interval '21 days'
        else interval '40 days'
      end;

      if v_loyalty.last_purchase_at is not null
         and v_loyalty.last_purchase_at < now() - v_loyalty_window then
        v_loyalty.progress_qty := 0;
      end if;

      -- Every purchase of this product counts as 1 toward the 10-purchase
      -- target, regardless of quantity — a whole bag and 500g both count as 1.
      v_item_reward := v_loyalty.progress_qty >= 10;

      if v_item_reward then
        v_final_unit_price := round(v_unit_price * 0.5, 2);
        v_item_discount := round((v_unit_price - v_final_unit_price) * v_quantity, 2);
        v_any_reward := true;
        v_loyalty.progress_qty := 0;
      else
        v_loyalty.progress_qty := v_loyalty.progress_qty + 1;
      end if;

      update public.customer_product_loyalty
      set progress_qty = v_loyalty.progress_qty,
          last_purchase_at = now(),
          last_purchase_unit = v_unit,
          updated_at = now()
      where id = v_loyalty.id;
    end if;

    insert into public.sale_items (sale_id, product_id, unit, quantity, unit_price, loyalty_discount)
    values (v_sale.id, v_product.id, v_unit, v_quantity, v_final_unit_price, v_item_discount);

    insert into public.stock_movements (org_id, product_id, type, unit, quantity, reference_id, created_by)
    values (v_org_id, v_product.id, 'egreso_venta', v_unit, -v_quantity, v_sale.id, auth.uid());

    v_subtotal := v_subtotal + (v_quantity * v_unit_price);
    v_discount := v_discount + v_item_discount;
  end loop;

  update public.sales
  set subtotal_amount = v_subtotal,
      discount_amount = v_discount,
      total_amount = v_subtotal - v_discount,
      is_loyalty_reward = v_any_reward
  where id = v_sale.id
  returning * into v_sale;

  return v_sale;
end;
$$;
