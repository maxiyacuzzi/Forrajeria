-- Payment method on sales (needed to know which sales are cash and affect the
-- till), plus cash registers (caja) and expenses (gastos) so the business can do
-- a daily cierre de caja: opening float + cash sales - cash expenses = expected
-- cash, reconciled against what's actually counted at close time.

create type public.payment_method as enum ('efectivo', 'transferencia', 'tarjeta');

create table public.cash_registers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  opening_amount numeric(14, 2) not null default 0,
  counted_amount numeric(14, 2),
  expected_amount numeric(14, 2),
  difference numeric(14, 2),
  status text not null default 'open' check (status in ('open', 'closed')),
  note text,
  opened_by uuid references public.profiles (id),
  closed_by uuid references public.profiles (id),
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);

create index cash_registers_org_id_idx on public.cash_registers (org_id, opened_at desc);

-- Only one open cash register per org at a time.
create unique index cash_registers_one_open_per_org
  on public.cash_registers (org_id)
  where status = 'open';

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  cash_register_id uuid references public.cash_registers (id) on delete set null,
  description text not null,
  amount numeric(14, 2) not null check (amount > 0),
  payment_method public.payment_method not null default 'efectivo',
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index expenses_org_id_idx on public.expenses (org_id, created_at desc);
create index expenses_cash_register_id_idx on public.expenses (cash_register_id);

alter table public.sales
  add column payment_method public.payment_method not null default 'efectivo',
  add column cash_register_id uuid references public.cash_registers (id) on delete set null;

create index sales_cash_register_id_idx on public.sales (cash_register_id);

alter table public.cash_registers enable row level security;
alter table public.expenses enable row level security;

create policy "org members can view cash registers"
  on public.cash_registers for select
  using (org_id = public.auth_org_id());

-- cash_registers is only ever written through the RPCs below (both security
-- definer), so no direct insert/update policy is needed here.

create policy "org members can view expenses"
  on public.expenses for select
  using (org_id = public.auth_org_id());

create policy "owner/vendedor can record expenses"
  on public.expenses for insert
  with check (
    org_id = public.auth_org_id()
    and public.auth_role() in ('owner', 'vendedor')
    and created_by = auth.uid()
  );

create policy "owner/vendedor can delete expenses"
  on public.expenses for delete
  using (org_id = public.auth_org_id() and public.auth_role() in ('owner', 'vendedor'));

-- Opens a new cash register (caja) with a starting cash float. Fails if one is
-- already open for the org (enforced by the partial unique index above).
create function public.open_cash_register(p_opening_amount numeric, p_note text default null)
returns public.cash_registers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid := public.auth_org_id();
  v_register public.cash_registers;
begin
  if public.auth_role() not in ('owner', 'vendedor') then
    raise exception 'No tiene permiso para abrir la caja';
  end if;

  if p_opening_amount < 0 then
    raise exception 'El monto inicial no puede ser negativo';
  end if;

  if exists (
    select 1 from public.cash_registers where org_id = v_org_id and status = 'open'
  ) then
    raise exception 'Ya hay una caja abierta';
  end if;

  insert into public.cash_registers (org_id, opening_amount, note, opened_by)
  values (v_org_id, p_opening_amount, p_note, auth.uid())
  returning * into v_register;

  return v_register;
end;
$$;

-- Closes a cash register: sums this session's cash sales and cash expenses to
-- compute the expected balance, then records the counted amount and the
-- difference between what was counted and what was expected.
create function public.close_cash_register(
  p_cash_register_id uuid,
  p_counted_amount numeric,
  p_note text default null
)
returns public.cash_registers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid := public.auth_org_id();
  v_register public.cash_registers;
  v_cash_sales numeric(14, 2);
  v_cash_expenses numeric(14, 2);
  v_expected numeric(14, 2);
begin
  if public.auth_role() not in ('owner', 'vendedor') then
    raise exception 'No tiene permiso para cerrar la caja';
  end if;

  if p_counted_amount < 0 then
    raise exception 'El monto contado no puede ser negativo';
  end if;

  select * into v_register
  from public.cash_registers
  where id = p_cash_register_id and org_id = v_org_id
  for update;

  if not found then
    raise exception 'Caja no encontrada';
  end if;

  if v_register.status = 'closed' then
    raise exception 'La caja ya está cerrada';
  end if;

  select coalesce(sum(total_amount), 0) into v_cash_sales
  from public.sales
  where cash_register_id = p_cash_register_id and payment_method = 'efectivo';

  select coalesce(sum(amount), 0) into v_cash_expenses
  from public.expenses
  where cash_register_id = p_cash_register_id and payment_method = 'efectivo';

  v_expected := v_register.opening_amount + v_cash_sales - v_cash_expenses;

  update public.cash_registers
  set status = 'closed',
      counted_amount = p_counted_amount,
      expected_amount = v_expected,
      difference = p_counted_amount - v_expected,
      closed_by = auth.uid(),
      closed_at = now(),
      note = coalesce(p_note, note)
  where id = p_cash_register_id
  returning * into v_register;

  return v_register;
end;
$$;

-- create_sale is redefined here to tag the sale with its payment method and
-- (if one is open) the org's current cash register, so the cierre de caja can
-- find it later. Body is otherwise unchanged from migration 0006.
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
  v_is_reward boolean;
  v_cash_register_id uuid;
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

  if v_customer.last_purchase_at is not null
     and v_customer.last_purchase_at < now() - interval '40 days' then
    v_customer.purchase_streak := 0;
  end if;

  v_is_reward := v_customer.purchase_streak >= 10;

  select id into v_cash_register_id
  from public.cash_registers
  where org_id = v_org_id and status = 'open';

  insert into public.sales (
    org_id, customer_id, note, created_by, is_loyalty_reward, payment_method, cash_register_id
  )
  values (
    v_org_id, p_customer_id, p_note, auth.uid(), v_is_reward, p_payment_method, v_cash_register_id
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
