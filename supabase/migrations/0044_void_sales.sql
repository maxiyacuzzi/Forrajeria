-- Voiding a sale (owner only, while its cash register is still open): the
-- sale stays on record, marked voided, and stops counting anywhere. Its
-- stock comes back (bags opened to sell loose stay opened), and the
-- customer's loyalty progress for its products is replayed without it.
-- A sale paid through Mercado Pago can't be voided until that payment is
-- refunded in Mercado Pago; an open (unpaid) charge is canceled by the app
-- before calling void_sale.

alter table public.sales
  add column voided_at timestamptz,
  add column voided_by uuid references public.profiles (id),
  add column void_reason text;

-- Replays a customer's purchase history of one product (non-voided sales
-- only) with the same rules create_sale applies: a purchase after a gap
-- longer than the window (21 days after a loose purchase, 40 after a bag)
-- restarts progress; reaching 10 earns the reward and restarts it.
create function public.recompute_customer_product_loyalty(
  p_customer_id uuid, p_product_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purchase record;
  v_progress numeric := 0;
  v_last_at timestamptz;
  v_last_unit text;
begin
  for v_purchase in
    select s.created_at, si.unit
    from public.sale_items si
    join public.sales s on s.id = si.sale_id
    where s.customer_id = p_customer_id
      and si.product_id = p_product_id
      and s.voided_at is null
    order by s.created_at, si.id
  loop
    if v_last_at is not null and v_purchase.created_at - v_last_at > case
      when v_last_unit = 'sale' then interval '21 days'
      else interval '40 days'
    end then
      v_progress := 0;
    end if;

    if v_progress >= 10 then
      v_progress := 0;
    else
      v_progress := v_progress + 1;
    end if;

    v_last_at := v_purchase.created_at;
    v_last_unit := v_purchase.unit;
  end loop;

  update public.customer_product_loyalty
  set progress_qty = v_progress,
      last_purchase_at = v_last_at,
      last_purchase_unit = v_last_unit,
      updated_at = now()
  where customer_id = p_customer_id and product_id = p_product_id;
end;
$$;

-- Internal helper for void_sale: it doesn't check the caller's org.
revoke execute on function public.recompute_customer_product_loyalty(uuid, uuid)
  from public, anon, authenticated;

create function public.void_sale(p_sale_id uuid, p_reason text default null)
returns public.sales
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid := public.auth_org_id();
  v_sale public.sales;
  v_movement public.stock_movements;
  v_product_id uuid;
begin
  if coalesce(public.auth_role(), '') <> 'owner' then
    raise exception 'Solo el dueño puede anular ventas';
  end if;

  select * into v_sale
  from public.sales
  where id = p_sale_id and org_id = v_org_id
  for update;

  if not found then
    raise exception 'Venta no encontrada';
  end if;

  if v_sale.voided_at is not null then
    raise exception 'La venta ya está anulada';
  end if;

  if exists (
    select 1 from public.cash_registers
    where id = v_sale.cash_register_id and status = 'closed'
  ) then
    raise exception 'La caja de esta venta ya está cerrada: no se puede anular';
  end if;

  if exists (
    select 1 from public.mercadopago_payments
    where sale_id = p_sale_id and status = 'processed'
  ) then
    raise exception 'La venta se cobró con Mercado Pago: primero devolvé el pago desde Mercado Pago';
  end if;

  if exists (
    select 1 from public.mercadopago_payments
    where sale_id = p_sale_id and status in ('created', 'at_terminal', 'action_required')
  ) then
    raise exception 'La venta tiene un cobro de Mercado Pago abierto: cancelalo primero';
  end if;

  -- Put back exactly what the sale took out (bag openings are left as is).
  for v_movement in
    select * from public.stock_movements
    where reference_id = p_sale_id and type = 'egreso_venta'
  loop
    insert into public.stock_movements (
      org_id, product_id, type, unit, quantity, reference_id, note, created_by
    )
    values (
      v_org_id, v_movement.product_id, 'anulacion_venta', v_movement.unit,
      -v_movement.quantity, p_sale_id, 'Anulación de venta', auth.uid()
    );
  end loop;

  update public.sales
  set voided_at = now(),
      voided_by = auth.uid(),
      void_reason = nullif(trim(p_reason), ''),
      awaiting_mp_payment = false
  where id = p_sale_id
  returning * into v_sale;

  for v_product_id in
    select distinct si.product_id
    from public.sale_items si
    join public.customer_product_loyalty l
      on l.customer_id = v_sale.customer_id and l.product_id = si.product_id
    where si.sale_id = p_sale_id
  loop
    perform public.recompute_customer_product_loyalty(v_sale.customer_id, v_product_id);
  end loop;

  return v_sale;
end;
$$;

-- Voided sales no longer count toward the expected cash.
create or replace function public.close_cash_register(
  p_cash_register_id uuid,
  p_counted_amount numeric,
  p_note text default null
)
returns public.cash_registers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid := public.auth_org_id();
  v_register public.cash_registers;
  v_cash_sales numeric(14, 2);
  v_cash_expenses numeric(14, 2);
  v_expected numeric(14, 2);
begin
  if public.auth_role() not in ('owner', 'vendedor') then
    raise exception 'No tiene permiso para cerrar la caja';
  end if;

  if p_counted_amount < 0 then
    raise exception 'El monto contado no puede ser negativo';
  end if;

  select * into v_register
  from public.cash_registers
  where id = p_cash_register_id and org_id = v_org_id
  for update;

  if not found then
    raise exception 'Caja no encontrada';
  end if;

  if v_register.status = 'closed' then
    raise exception 'La caja ya está cerrada';
  end if;

  select coalesce(sum(total_amount), 0) into v_cash_sales
  from public.sales
  where cash_register_id = p_cash_register_id and payment_method = 'efectivo'
    and voided_at is null;

  select coalesce(sum(amount), 0) into v_cash_expenses
  from public.expense_payments
  where cash_register_id = p_cash_register_id and payment_method = 'efectivo';

  v_expected := v_register.opening_amount + v_cash_sales - v_cash_expenses;

  update public.cash_registers
  set status = 'closed',
      counted_amount = p_counted_amount,
      expected_amount = v_expected,
      difference = p_counted_amount - v_expected,
      closed_by = auth.uid(),
      closed_at = now(),
      note = coalesce(p_note, note)
  where id = p_cash_register_id
  returning * into v_register;

  return v_register;
end;
$$;

-- A voided sale can no longer be settled another way either.
create or replace function public.settle_mp_sale_otherwise(
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

  if v_sale.voided_at is not null then
    raise exception 'La venta está anulada';
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
