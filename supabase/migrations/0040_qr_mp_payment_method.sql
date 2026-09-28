-- New payment method: the customer scans the store's Mercado Pago QR at the
-- counter. Kept apart from posnet_mp because the sale is confirmed as paid by
-- the Orders API (webhook / polling), not by the cashier. Own migration since a
-- new enum value can't be used in the same transaction that adds it.

alter type public.payment_method add value 'qr_mp';
