-- Suppliers: who a product is bought from. Products get an optional supplier_id
-- so the catalog can be filtered/grouped by provider.

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  contact_name text,
  phone text,
  email text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, name)
);

create index suppliers_org_id_idx on public.suppliers (org_id);

create trigger suppliers_set_updated_at
  before update on public.suppliers
  for each row execute function public.set_updated_at();

alter table public.products
  add column supplier_id uuid references public.suppliers (id) on delete set null;

create index products_supplier_id_idx on public.products (supplier_id);

alter table public.suppliers enable row level security;

create policy "org members can view suppliers"
  on public.suppliers for select
  using (org_id = public.auth_org_id());

create policy "owner/deposito can manage suppliers"
  on public.suppliers for all
  using (org_id = public.auth_org_id() and public.auth_role() in ('owner', 'deposito'))
  with check (org_id = public.auth_org_id() and public.auth_role() in ('owner', 'deposito'));
