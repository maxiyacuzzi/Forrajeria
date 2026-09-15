-- The same product can be bought from more than one supplier, so a single
-- products.supplier_id can't represent that. This replaces it with a join
-- table (many products <-> many suppliers), which also lets a supplier's
-- bulk price increase be applied to exactly the products they supply.
-- cost_price stays a single value on products — what we're currently
-- paying, which the automatic pricing calc already consumes.

create table public.product_suppliers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (product_id, supplier_id)
);

create index product_suppliers_org_id_idx on public.product_suppliers (org_id);
create index product_suppliers_product_id_idx on public.product_suppliers (product_id);
create index product_suppliers_supplier_id_idx on public.product_suppliers (supplier_id);

alter table public.product_suppliers enable row level security;

create policy "org members can view product suppliers"
  on public.product_suppliers for select
  using (org_id = public.auth_org_id());

create policy "owner/deposito can manage product suppliers"
  on public.product_suppliers for all
  using (org_id = public.auth_org_id() and public.auth_role() in ('owner', 'deposito'))
  with check (org_id = public.auth_org_id() and public.auth_role() in ('owner', 'deposito'));

insert into public.product_suppliers (org_id, product_id, supplier_id)
select org_id, id, supplier_id from public.products where supplier_id is not null;

drop index if exists products_supplier_id_idx;

alter table public.products drop column supplier_id;
