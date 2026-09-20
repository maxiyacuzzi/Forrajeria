-- "Consumidor Final" (walk-in customer): sales shouldn't require registering a
-- real person. Every org gets one customer flagged is_default, pre-selected in
-- the sale forms so cashiers can check out without picking anyone.

alter table public.customers
  add column is_default boolean not null default false;

-- At most one default customer per org.
create unique index customers_org_default_idx
  on public.customers (org_id)
  where is_default;

-- Give every new org a default "Consumidor Final" customer as soon as it's created.
create or replace function public.create_org_with_owner(org_name text)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org public.organizations;
begin
  if exists (select 1 from public.profiles where id = auth.uid() and org_id is not null) then
    raise exception 'El usuario ya pertenece a una organización';
  end if;

  insert into public.organizations (name) values (org_name) returning * into new_org;

  update public.profiles
  set org_id = new_org.id, role = 'owner'
  where id = auth.uid();

  insert into public.customers (org_id, name, is_default)
  values (new_org.id, 'Consumidor Final', true);

  return new_org;
end;
$$;

-- Backfill: every org that already exists (created before this migration) gets
-- one too, if it doesn't already have a default customer.
insert into public.customers (org_id, name, is_default)
select o.id, 'Consumidor Final', true
from public.organizations o
where not exists (
  select 1 from public.customers c where c.org_id = o.id and c.is_default
);
