-- New payment method: paying through a Mercado Pago posnet, distinct from a
-- generic "tarjeta" (bank posnet) — it doesn't carry the card surcharge added
-- in the next migration, since Mercado Pago's own fee structure is different.

alter type public.payment_method add value 'posnet_mp';
