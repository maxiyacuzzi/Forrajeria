-- Loyalty moves from "every 10 sales" (one counter per customer, blind to
-- what was bought) to "every 10 units of the SAME product" — fraccionable
-- products count in kg-equivalent (10 bolsas = 10 * conversion_factor kg,
-- whether bought as whole bags or loose kg; they add to the same total).
-- The 50% discount applies only to that product's line in the qualifying
-- sale — the rest of the sale is unaffected. A 40-day gap without buying
-- THAT specific product resets only its own progress.

create table public.customer_product_loyalty (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  progress_qty numeric(14, 3) not null default 0,
  last_purchase_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (customer_id, product_id)
);

create index customer_product_loyalty_org_id_idx on public.customer_product_loyalty (org_id);
create index customer_product_loyalty_customer_id_idx
  on public.customer_product_loyalty (customer_id);

alter table public.customer_product_loyalty enable row level security;

create policy "org members can view product loyalty"
  on public.customer_product_loyalty for select
  using (org_id = public.auth_org_id());

-- Only ever written through create_sale() (security definer) below, so no
-- insert/update policy is needed.

alter table public.sale_items
  add column loyalty_discount numeric(14, 2) not null default 0;

drop function if exists public.create_sale(uuid, jsonb, text, public.payment_method);

create function public.create_sale(
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
  v_target numeric(14, 3);
  v_contribution numeric(14, 3);
  v_item_reward boolean;
  v_final_unit_price numeric(14, 2);
  v_item_discount numeric(14, 2);
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

    if (v_unit = 'purchase' and v_product.stock_qty < v_quantity)
       or (v_unit = 'sale' and v_product.stock_open_qty < v_quantity) then
      raise exception 'Stock insuficiente para %', v_product.name;
    end if;

    select * into v_loyalty
    from public.customer_product_loyalty
    where customer_id = p_customer_id and product_id = v_product.id
    for update;

    if not found then
      insert into public.customer_product_loyalty (org_id, customer_id, product_id)
      values (v_org_id, p_customer_id, v_product.id)
      returning * into v_loyalty;
    end if;

    -- A 40-day gap without buying THIS product resets only its own progress.
    if v_loyalty.last_purchase_at is not null
       and v_loyalty.last_purchase_at < now() - interval '40 days' then
      v_loyalty.progress_qty := 0;
    end if;

    if v_product.unit_type = 'fraccionable' and v_product.conversion_factor is not null then
      v_target := 10 * v_product.conversion_factor;
      v_contribution := case
        when v_unit = 'purchase' then v_quantity * v_product.conversion_factor
        else v_quantity
      end;
    else
      v_target := 10;
      v_contribution := v_quantity;
    end if;

    v_item_reward := v_loyalty.progress_qty >= v_target;

    if v_item_reward then
      v_final_unit_price := round(v_unit_price * 0.5, 2);
      v_item_discount := round((v_unit_price - v_final_unit_price) * v_quantity, 2);
      v_any_reward := true;
      v_loyalty.progress_qty := 0;
    else
      v_final_unit_price := v_unit_price;
      v_item_discount := 0;
      v_loyalty.progress_qty := v_loyalty.progress_qty + v_contribution;
    end if;

    update public.customer_product_loyalty
    set progress_qty = v_loyalty.progress_qty,
        last_purchase_at = now(),
        updated_at = now()
    where id = v_loyalty.id;

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

alter table public.customers
  drop column purchase_streak,
  drop column last_purchase_at;
