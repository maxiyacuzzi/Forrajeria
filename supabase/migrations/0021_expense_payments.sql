-- Expenses can now be owed instead of always paid in full immediately:
-- registering merchandise from a supplier creates a gasto for what's owed,
-- and it may be paid in full, in part, or not at all right then. Payments
-- (the initial one and any later top-ups) are their own ledger rows so cash
-- register reconciliation attributes each peso that actually left the
-- register to the shift it left in — not to whenever the debt was first
-- recorded.

alter table public.expenses
  add column supplier_id uuid references public.suppliers (id) on delete set null,
  add column paid_amount numeric(14, 2) not null default 0 check (paid_amount >= 0);

-- Every expense so far was paid in full at creation time (the only mode that
-- existed before this migration) — preserve that.
update public.expenses set paid_amount = amount;

alter table public.expenses
  add constraint expenses_paid_amount_not_over_total check (paid_amount <= amount);

create index expenses_supplier_id_idx on public.expenses (supplier_id);

create table public.expense_payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  expense_id uuid not null references public.expenses (id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  payment_method public.payment_method not null default 'efectivo',
  cash_register_id uuid references public.cash_registers (id) on delete set null,
  note text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index expense_payments_org_id_idx on public.expense_payments (org_id, created_at desc);
create index expense_payments_expense_id_idx on public.expense_payments (expense_id);
create index expense_payments_cash_register_id_idx on public.expense_payments (cash_register_id);

-- Backfill: one payment per existing expense, so historical cash register
-- closes (which this migration repoints at expense_payments) stay correct.
insert into public.expense_payments (
  org_id, expense_id, amount, payment_method, cash_register_id, created_by, created_at
)
select org_id, id, amount, payment_method, cash_register_id, created_by, created_at
from public.expenses;

alter table public.expense_payments enable row level security;

create policy "org members can view expense payments"
  on public.expense_payments for select
  using (org_id = public.auth_org_id());

-- Payments are only ever written through register_expense_payment() (security
-- definer) below, so paid_amount on expenses can never drift out of sync with
-- the ledger. No insert/update/delete policy is needed here.

-- Records a payment against an expense (used both for the initial payment at
-- creation time and any later top-up) and keeps expenses.paid_amount in sync.
create function public.register_expense_payment(
  p_expense_id uuid,
  p_amount numeric,
  p_payment_method public.payment_method default 'efectivo',
  p_note text default null
)
returns public.expense_payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid := public.auth_org_id();
  v_expense public.expenses;
  v_cash_register_id uuid;
  v_payment public.expense_payments;
begin
  if public.auth_role() not in ('owner', 'vendedor') then
    raise exception 'No tiene permiso para registrar pagos';
  end if;

  if p_amount <= 0 then
    raise exception 'El monto del pago debe ser mayor a cero';
  end if;

  select * into v_expense
  from public.expenses
  where id = p_expense_id and org_id = v_org_id
  for update;

  if not found then
    raise exception 'Gasto no encontrado';
  end if;

  if v_expense.paid_amount + p_amount > v_expense.amount then
    raise exception 'El pago supera la deuda pendiente';
  end if;

  select id into v_cash_register_id
  from public.cash_registers
  where org_id = v_org_id and status = 'open';

  insert into public.expense_payments (
    org_id, expense_id, amount, payment_method, cash_register_id, note, created_by
  )
  values (
    v_org_id, p_expense_id, p_amount, p_payment_method, v_cash_register_id, p_note, auth.uid()
  )
  returning * into v_payment;

  update public.expenses
  set paid_amount = paid_amount + p_amount
  where id = p_expense_id;

  return v_payment;
end;
$$;

-- close_cash_register is redefined here to sum expense_payments instead of
-- expenses, so an unpaid or partially paid supplier debt no longer reduces
-- the expected cash balance for money that hasn't actually left the register.
-- Body is otherwise unchanged from migration 0012.
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
  where cash_register_id = p_cash_register_id and payment_method = 'efectivo';

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
