-- Integrated Mercado Pago Point terminals. When an organization picks a Point
-- (in PDV mode) the "posnet_mp" payment method stops being manual: the sale's
-- total is sent to the terminal through the Orders API, like the QR flow.
--
-- Whether a sale still waits for a Mercado Pago payment becomes an explicit
-- flag instead of being derived from mercadopago_payments, so a cashier can
-- settle a Point sale by hand ("lo cobré en el posnet") without it staying
-- pending because its last order was canceled.

alter table public.mercadopago_connections
  add column point_terminal_id text;

alter table public.mercadopago_payments
  add column kind text not null default 'qr' check (kind in ('qr', 'point'));

alter table public.sales
  add column awaiting_mp_payment boolean not null default false;

-- QR sales created before this migration that were never paid.
update public.sales s
set awaiting_mp_payment = true
where s.payment_method = 'qr_mp'
  and not exists (
    select 1 from public.mercadopago_payments p
    where p.sale_id = s.id and p.status = 'processed'
  );

drop function public.mercadopago_connection_status();

create function public.mercadopago_connection_status()
returns table (
  connected boolean,
  nickname text,
  live_mode boolean,
  connected_at timestamptz,
  qr_ready boolean,
  qr_image_url text,
  qr_template_url text,
  point_terminal_id text
)
language sql
security definer
stable
set search_path = public
as $$
  select true, c.nickname, c.live_mode, c.connected_at,
    c.external_pos_id is not null, c.qr_image_url, c.qr_template_url, c.point_terminal_id
  from public.mercadopago_connections c
  where c.org_id = public.auth_org_id()
  union all
  select false, null, null, null, false, null, null, null
  where not exists (
    select 1 from public.mercadopago_connections c where c.org_id = public.auth_org_id()
  )
  limit 1;
$$;

drop function public.change_qr_sale_payment_method(uuid, public.payment_method);

-- Settles a sale that is waiting for a Mercado Pago payment (QR or Point) some
-- other way. "posnet_mp" here means it was charged by hand on the posnet. Not
-- for "tarjeta" (its surcharge would have to be recomputed) nor once the
-- sale's register is closed.
create function public.settle_mp_sale_otherwise(
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
  if coalesce(public.auth_role(), '') not in ('owner', 'vendedor', 'deposito') then
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

  if not v_sale.awaiting_mp_payment then
    raise exception 'La venta no está esperando un pago de Mercado Pago';
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

  update public.sales
  set payment_method = p_payment_method, awaiting_mp_payment = false
  where id = p_sale_id;
end;
$$;
