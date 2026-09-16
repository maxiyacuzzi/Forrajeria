-- The category tree seeded in 0008/0010 only ran against Stage, since Prod's
-- "Mundo Animal Rio 1" org didn't exist yet at the time (both migrations are
-- no-ops when that org is missing). Now that the real org has been created
-- in Prod via onboarding, backfill the same tree there. Guarded by org name
-- like 0008/0010, and idempotent (on conflict do nothing) so it's a safe
-- no-op on Stage, which already has these rows.

do $$
declare
  v_org_id uuid;
  v_balanceado_id uuid;
  v_gato_id uuid;
  v_perro_id uuid;
  v_perro_adulto_id uuid;
begin
  select id into v_org_id from public.organizations where name = 'Mundo Animal Rio 1';

  if v_org_id is null then
    return;
  end if;

  insert into public.product_categories (org_id, name, parent_id)
  values (v_org_id, 'Balanceado', null)
  on conflict (org_id, name) where parent_id is null do nothing;

  select id into v_balanceado_id
  from public.product_categories
  where org_id = v_org_id and name = 'Balanceado' and parent_id is null;

  insert into public.product_categories (org_id, name, parent_id)
  values
    (v_org_id, 'Gato', v_balanceado_id),
    (v_org_id, 'Perro', v_balanceado_id)
  on conflict (org_id, parent_id, name) do nothing;

  select id into v_gato_id
  from public.product_categories
  where org_id = v_org_id and name = 'Gato' and parent_id = v_balanceado_id;

  select id into v_perro_id
  from public.product_categories
  where org_id = v_org_id and name = 'Perro' and parent_id = v_balanceado_id;

  insert into public.product_categories (org_id, name, parent_id)
  values
    (v_org_id, 'Cachorro', v_gato_id),
    (v_org_id, 'Castrado-Urinary', v_gato_id),
    (v_org_id, 'Adulto', v_gato_id),
    (v_org_id, 'Cachorro', v_perro_id),
    (v_org_id, 'Adulto', v_perro_id)
  on conflict (org_id, parent_id, name) do nothing;

  select id into v_perro_adulto_id
  from public.product_categories
  where org_id = v_org_id and name = 'Adulto' and parent_id = v_perro_id;

  insert into public.product_categories (org_id, name, parent_id)
  values (v_org_id, 'Mordida pequeña', v_perro_adulto_id)
  on conflict (org_id, parent_id, name) do nothing;
end $$;
