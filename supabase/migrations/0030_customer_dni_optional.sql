-- Not every walk-in customer wants to give their DNI on the spot — make it
-- optional. The existing unique (org_id, dni) constraint already allows
-- multiple NULLs in Postgres, so no change needed there.

alter table public.customers alter column dni drop not null;
