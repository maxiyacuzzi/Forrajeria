-- Stores the OAuth tokens from Mercado Pago's own "Connect" flow, letting each
-- organization link the seller account that receives its Mercado Pago payments.
-- Tokens are sensitive, so RLS grants no direct access to authenticated/anon —
-- reads/writes go through the service-role client (OAuth route handlers) or the
-- security-definer RPCs below, which only ever expose non-secret fields.

create table public.mercadopago_connections (
  org_id uuid primary key references public.organizations (id) on delete cascade,
  mp_user_id bigint not null,
  email text,
  nickname text,
  live_mode boolean not null default false,
  scope text,
  access_token text not null,
  refresh_token text not null,
  public_key text,
  expires_at timestamptz not null,
  connected_by uuid references public.profiles (id) on delete set null,
  connected_at timestamptz not null default now()
);

alter table public.mercadopago_connections enable row level security;
-- No policies: only the service role (route handlers) and the security-definer
-- functions below can touch this table.

create function public.mercadopago_connection_status()
returns table (connected boolean, nickname text, live_mode boolean, connected_at timestamptz)
language sql
security definer
stable
set search_path = public
as $$
  select true, c.nickname, c.live_mode, c.connected_at
  from public.mercadopago_connections c
  where c.org_id = public.auth_org_id()
  union all
  select false, null, null, null
  where not exists (
    select 1 from public.mercadopago_connections c where c.org_id = public.auth_org_id()
  )
  limit 1;
$$;

create function public.disconnect_mercadopago()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.auth_role() != 'owner' then
    raise exception 'Solo el dueño puede desconectar Mercado Pago';
  end if;

  delete from public.mercadopago_connections where org_id = public.auth_org_id();
end;
$$;
