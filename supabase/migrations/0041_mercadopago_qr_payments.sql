-- In-person QR payments through Mercado Pago's Orders API. Each organization
-- gets one store + one POS in its linked Mercado Pago account; the POS carries a
-- static QR printed at the counter. A sale paid with qr_mp creates an order on
-- that POS and is confirmed when the order reaches status "processed".

alter table public.mercadopago_connections
  add column store_id text,
  add column external_pos_id text,
  add column qr_image_url text,
  add column qr_template_url text;

drop function public.mercadopago_connection_status();

create function public.mercadopago_connection_status()
returns table (
  connected boolean,
  nickname text,
  live_mode boolean,
  connected_at timestamptz,
  qr_ready boolean,
  qr_image_url text,
  qr_template_url text
)
language sql
security definer
stable
set search_path = public
as $$
  select true, c.nickname, c.live_mode, c.connected_at,
    c.external_pos_id is not null, c.qr_image_url, c.qr_template_url
  from public.mercadopago_connections c
  where c.org_id = public.auth_org_id()
  union all
  select false, null, null, null, false, null, null
  where not exists (
    select 1 from public.mercadopago_connections c where c.org_id = public.auth_org_id()
  )
  limit 1;
$$;

-- One row per Mercado Pago order created for a sale (a retry after an expired
-- order adds a new row). Written only by the service role (server actions and
-- the webhook); org members can read status to show it on the sale.
create table public.mercadopago_payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  sale_id uuid not null references public.sales (id) on delete cascade,
  mp_order_id text not null unique,
  amount numeric(14, 2) not null,
  status text not null default 'created',
  status_detail text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index mercadopago_payments_sale_id_idx
  on public.mercadopago_payments (sale_id, created_at desc);

alter table public.mercadopago_payments enable row level security;

create policy "org members can view mercado pago payments"
  on public.mercadopago_payments for select
  to authenticated
  using (org_id = public.auth_org_id());

-- Lets the cashier settle a QR sale another way when the customer doesn't pay
-- with Mercado Pago. Not allowed once the QR was paid, for "tarjeta" (its
-- surcharge would have to be recomputed) or when the sale's register is closed.
create function public.change_qr_sale_payment_method(
  p_sale_id uuid, p_payment_method public.payment_method
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale public.sales;
begin
  if public.auth_role() not in ('owner', 'vendedor', 'deposito') then
    raise exception 'No tiene permiso para modificar ventas';
  end if;

  if p_payment_method not in ('efectivo', 'transferencia', 'posnet_mp') then
    raise exception 'Medio de pago no permitido';
  end if;

  select * into v_sale
  from public.sales
  where id = p_sale_id and org_id = public.auth_org_id()
  for update;

  if not found then
    raise exception 'Venta no encontrada';
  end if;

  if v_sale.payment_method <> 'qr_mp' then
    raise exception 'La venta no se cobra con QR de Mercado Pago';
  end if;

  if exists (
    select 1 from public.mercadopago_payments
    where sale_id = p_sale_id and status = 'processed'
  ) then
    raise exception 'La venta ya fue pagada con Mercado Pago';
  end if;

  if exists (
    select 1 from public.cash_registers
    where id = v_sale.cash_register_id and status = 'closed'
  ) then
    raise exception 'La caja de esta venta ya está cerrada';
  end if;

  update public.sales set payment_method = p_payment_method where id = p_sale_id;
end;
$$;
