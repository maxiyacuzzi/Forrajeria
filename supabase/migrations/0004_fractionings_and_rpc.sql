-- Fractionings: opening a closed bag (bolsa) into loose stock (kg), and closing it
-- once the real obtained quantity is known, recording the shrinkage (merma).

create table public.fractionings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  bags_opened numeric(12, 3) not null check (bags_opened > 0),
  expected_qty numeric(14, 3) not null,
  actual_qty numeric(14, 3),
  shrinkage_qty numeric(14, 3) generated always as (expected_qty - coalesce(actual_qty, expected_qty)) stored,
  status text not null default 'open' check (status in ('open', 'closed')),
  opened_by uuid references public.profiles (id),
  closed_by uuid references public.profiles (id),
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);

create index fractionings_org_id_idx on public.fractionings (org_id);
create index fractionings_product_id_idx on public.fractionings (product_id, opened_at desc);

alter table public.fractionings enable row level security;

create policy "org members can view fractionings"
  on public.fractionings for select
  using (org_id = public.auth_org_id());

-- Inserts/updates to fractionings only ever happen through the RPCs below
-- (both security definer), so no direct insert/update policy is needed here.

-- Opens a fractioning: discounts `bags_opened` closed units and credits the
-- theoretical loose quantity (bags_opened * conversion_factor) as open stock.
create function public.open_fractioning(p_product_id uuid, p_bags_opened numeric)
returns public.fractionings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products;
  v_org_id uuid := public.auth_org_id();
  v_expected numeric(14, 3);
  v_fractioning public.fractionings;
begin
  if public.auth_role() not in ('owner', 'deposito') then
    raise exception 'No tiene permiso para fraccionar stock';
  end if;

  if p_bags_opened <= 0 then
    raise exception 'La cantidad de bolsas a abrir debe ser mayor a cero';
  end if;

  select * into v_product
  from public.products
  where id = p_product_id and org_id = v_org_id
  for update;

  if not found then
    raise exception 'Producto no encontrado';
  end if;

  if v_product.unit_type <> 'fraccionable' then
    raise exception 'El producto % no es fraccionable', v_product.name;
  end if;

  if v_product.stock_qty < p_bags_opened then
    raise exception 'Stock insuficiente: hay % % disponibles', v_product.stock_qty, v_product.purchase_unit_label;
  end if;

  v_expected := p_bags_opened * v_product.conversion_factor;

  insert into public.fractionings (org_id, product_id, bags_opened, expected_qty, opened_by)
  values (v_org_id, p_product_id, p_bags_opened, v_expected, auth.uid())
  returning * into v_fractioning;

  insert into public.stock_movements (org_id, product_id, type, unit, quantity, reference_id, created_by)
  values (v_org_id, p_product_id, 'fraccionamiento_apertura', 'purchase', -p_bags_opened, v_fractioning.id, auth.uid());

  insert into public.stock_movements (org_id, product_id, type, unit, quantity, reference_id, created_by)
  values (v_org_id, p_product_id, 'fraccionamiento_apertura', 'sale', v_expected, v_fractioning.id, auth.uid());

  return v_fractioning;
end;
$$;

-- Closes a fractioning: records the real obtained quantity and adjusts open
-- stock by the shrinkage (expected - actual), which can be zero.
create function public.close_fractioning(p_fractioning_id uuid, p_actual_qty numeric)
returns public.fractionings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fractioning public.fractionings;
  v_org_id uuid := public.auth_org_id();
  v_shrinkage numeric(14, 3);
begin
  if public.auth_role() not in ('owner', 'deposito') then
    raise exception 'No tiene permiso para cerrar un fraccionamiento';
  end if;

  if p_actual_qty < 0 then
    raise exception 'La cantidad obtenida no puede ser negativa';
  end if;

  select * into v_fractioning
  from public.fractionings
  where id = p_fractioning_id and org_id = v_org_id
  for update;

  if not found then
    raise exception 'Fraccionamiento no encontrado';
  end if;

  if v_fractioning.status = 'closed' then
    raise exception 'El fraccionamiento ya está cerrado';
  end if;

  v_shrinkage := v_fractioning.expected_qty - p_actual_qty;

  update public.fractionings
  set actual_qty = p_actual_qty,
      status = 'closed',
      closed_by = auth.uid(),
      closed_at = now()
  where id = p_fractioning_id
  returning * into v_fractioning;

  if v_shrinkage <> 0 then
    insert into public.stock_movements (org_id, product_id, type, unit, quantity, reference_id, note, created_by)
    values (
      v_org_id, v_fractioning.product_id, 'fraccionamiento_merma', 'sale', -v_shrinkage, v_fractioning.id,
      case when v_shrinkage < 0 then 'Ajuste positivo: se obtuvo más de lo esperado' else null end,
      auth.uid()
    );
  end if;

  return v_fractioning;
end;
$$;
