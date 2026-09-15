-- Supports a dedicated "Ingreso de mercadería" flow: registering stock that
-- arrived from a supplier links the movement to who sent it and what it cost,
-- so 'ingreso_compra' movements carry more than the generic ajuste_manual ones.

alter table public.stock_movements
  add column supplier_id uuid references public.suppliers (id) on delete set null,
  add column unit_cost numeric(14, 2);

create index stock_movements_supplier_id_idx on public.stock_movements (supplier_id);
