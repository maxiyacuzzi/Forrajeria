-- Organizations (tenants) and user profiles/roles.
-- Every business table in later migrations carries org_id and is isolated via RLS
-- using the auth_org_id() helper defined at the bottom of this file.

create type public.user_role as enum ('owner', 'vendedor', 'deposito');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  org_id uuid references public.organizations (id) on delete cascade,
  role public.user_role not null default 'vendedor',
  full_name text,
  created_at timestamptz not null default now()
);

-- Creates an empty profile (no org yet) whenever a new auth user signs up.
-- The user is assigned an organization via create_org_with_owner() during onboarding.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Onboarding RPC: turns a profile with no org into the owner of a brand new organization.
create function public.create_org_with_owner(org_name text)
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

  return new_org;
end;
$$;

-- Helper used by RLS policies across all business tables: the caller's org_id, or null
-- if they have no profile/org yet (in which case every org_id = auth_org_id() check fails closed).
create function public.auth_org_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select org_id from public.profiles where id = auth.uid();
$$;

create function public.auth_role()
returns public.user_role
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;

create policy "members can view their organization"
  on public.organizations for select
  using (id = public.auth_org_id());

create policy "users can view profiles in their organization"
  on public.profiles for select
  using (org_id = public.auth_org_id());

create policy "users can view their own profile"
  on public.profiles for select
  using (id = auth.uid());
