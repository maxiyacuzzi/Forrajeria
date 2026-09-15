-- Customers and sales: registers clientes (dni, nombre, dirección, whatsapp) and the
-- sales made to them, itemized by product. Sales deduct stock through stock_movements
-- (egreso_venta), the same source of truth used by the rest of the stock module.

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  dni text not null,
  name text not null,
  address text,
  whatsapp text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, dni)
);

create index customers_org_id_idx on public.customers (org_id);

create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete restrict,
  total_amount numeric(14, 2) not null default 0,
  note text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index sales_org_id_idx on public.sales (org_id);
create index sales_customer_id_idx on public.sales (customer_id, created_at desc);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  unit text not null check (unit in ('purchase', 'sale')),
  quantity numeric(14, 3) not null check (quantity > 0),
  unit_price numeric(14, 2) not null default 0,
  subtotal numeric(14, 2) generated always as (quantity * unit_price) stored
);

create index sale_items_sale_id_idx on public.sale_items (sale_id);

alter table public.customers enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;

create policy "org members can view customers"
  on public.customers for select
  using (org_id = public.auth_org_id());

create policy "org members can manage customers"
  on public.customers for all
  using (org_id = public.auth_org_id())
  with check (org_id = public.auth_org_id());

create policy "org members can view sales"
  on public.sales for select
  using (org_id = public.auth_org_id());

create policy "org members can view sale items"
  on public.sale_items for select
  using (exists (
    select 1 from public.sales
    where sales.id = sale_items.sale_id and sales.org_id = public.auth_org_id()
  ));

-- sales/sale_items are only ever written through create_sale() (security definer),
-- so no direct insert/update policy is needed for them.

-- Registers a sale for a customer: validates stock for every line, inserts the sale
-- and its items, and records one egreso_venta stock movement per item.
create function public.create_sale(p_customer_id uuid, p_items jsonb, p_note text default null)
returns public.sales
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid := public.auth_org_id();
  v_sale public.sales;
  v_item jsonb;
  v_product public.products;
  v_quantity numeric(14, 3);
  v_unit text;
  v_unit_price numeric(14, 2);
  v_total numeric(14, 2) := 0;
begin
  if public.auth_role() not in ('owner', 'vendedor', 'deposito') then
    raise exception 'No tiene permiso para registrar ventas';
  end if;

  if not exists (
    select 1 from public.customers where id = p_customer_id and org_id = v_org_id
  ) then
    raise exception 'Cliente no encontrado';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta debe tener al menos un producto';
  end if;

  insert into public.sales (org_id, customer_id, note, created_by)
  values (v_org_id, p_customer_id, p_note, auth.uid())
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

    v_total := v_total + (v_quantity * v_unit_price);
  end loop;

  update public.sales set total_amount = v_total where id = v_sale.id
  returning * into v_sale;

  return v_sale;
end;
$$;
