-- Stock movement that puts back what a voided sale took out. Own migration
-- since a new enum value can't be used in the same transaction that adds it.

alter type public.stock_movement_type add value 'anulacion_venta';
