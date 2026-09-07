-- stock_movements is the single source of truth for every stock change.
-- products.stock_qty / stock_open_qty are always derived from it via the
-- apply_stock_movement trigger below — nothing should update those columns directly.

create type public.stock_movement_type as enum (
  'ingreso_compra',
  'egreso_venta',
  'fraccionamiento_apertura',
  'fraccionamiento_merma',
  'mezcla_insumo',
  'mezcla_producto',
  'ajuste_manual',
  'rotura_humedad'
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  type public.stock_movement_type not null,
  unit text not null check (unit in ('purchase', 'sale')),
  quantity numeric(14, 3) not null,
  reference_id uuid,
  note text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index stock_movements_org_id_idx on public.stock_movements (org_id);
create index stock_movements_product_id_idx on public.stock_movements (product_id, created_at desc);

create function public.apply_stock_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.unit = 'purchase' then
    update public.products
    set stock_qty = stock_qty + new.quantity
    where id = new.product_id;
  else
    update public.products
    set stock_open_qty = stock_open_qty + new.quantity
    where id = new.product_id;
  end if;
  return new;
end;
$$;

create trigger trg_apply_stock_movement
  after insert on public.stock_movements
  for each row execute function public.apply_stock_movement();

alter table public.stock_movements enable row level security;

create policy "org members can view stock movements"
  on public.stock_movements for select
  using (org_id = public.auth_org_id());

create policy "owner/deposito can record stock movements"
  on public.stock_movements for insert
  with check (
    org_id = public.auth_org_id()
    and public.auth_role() in ('owner', 'deposito')
    and created_by = auth.uid()
  );
