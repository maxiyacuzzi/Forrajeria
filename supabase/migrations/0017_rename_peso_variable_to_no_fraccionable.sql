-- "peso_variable" renamed to "no_fraccionable": the old name emphasized that the
-- weight varies, which read as confusingly close to "fraccionable". The name that
-- actually matters is the one real behavior difference — this unit is never sold
-- loose, always as a whole counted item (fardos, bultos). Only the label changes;
-- existing rows, reference_weight, and stock all stay as they were.

alter type public.product_unit_type rename value 'peso_variable' to 'no_fraccionable';
