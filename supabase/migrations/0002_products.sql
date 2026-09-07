-- Products: the "stock y fraccionamiento" module (PRD prioridad 1).
--
-- unit_type drives how a product's stock is tracked:
--   simple        -> stock_qty only (bought and sold in the same unit)
--   fraccionable  -> stock_qty (closed purchase units, e.g. bolsas) +
--                    stock_open_qty (loose sale units, e.g. kg) via conversion_factor
--   peso_variable -> stock_qty only (counted units, e.g. fardos), reference_weight
--                    is used for pricing/costing, not for stock accounting

create type public.product_unit_type as enum ('simple', 'fraccionable', 'peso_variable');

create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (org_id, name)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  brand text,
  category_id uuid references public.product_categories (id) on delete set null,

  unit_type public.product_unit_type not null default 'simple',
  purchase_unit_label text not null default 'unidad',
  sale_unit_label text not null default 'unidad',
  conversion_factor numeric(12, 3),
  reference_weight numeric(12, 3),

  controls_expiration boolean not null default false,
  min_stock_alert numeric(12, 3),

  stock_qty numeric(14, 3) not null default 0,
  stock_open_qty numeric(14, 3) not null default 0,
  cost_price numeric(14, 2) not null default 0,

  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint conversion_factor_required_when_fraccionable check (
    unit_type <> 'fraccionable' or conversion_factor is not null
  ),
  constraint stock_not_negative check (stock_qty >= 0 and stock_open_qty >= 0)
);

create index products_org_id_idx on public.products (org_id);
create index products_category_id_idx on public.products (category_id);

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

alter table public.product_categories enable row level security;
alter table public.products enable row level security;

create policy "org members can view categories"
  on public.product_categories for select
  using (org_id = public.auth_org_id());

create policy "owner/deposito can manage categories"
  on public.product_categories for all
  using (org_id = public.auth_org_id() and public.auth_role() in ('owner', 'deposito'))
  with check (org_id = public.auth_org_id() and public.auth_role() in ('owner', 'deposito'));

create policy "org members can view products"
  on public.products for select
  using (org_id = public.auth_org_id());

create policy "owner/deposito can manage products"
  on public.products for all
  using (org_id = public.auth_org_id() and public.auth_role() in ('owner', 'deposito'))
  with check (org_id = public.auth_org_id() and public.auth_role() in ('owner', 'deposito'));
