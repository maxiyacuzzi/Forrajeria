-- Splits the flat "A > B > C" category names seeded for "Mundo Animal Rio 1"
-- (migration 0008, before the category tree existed) into real parent/child rows,
-- reassigns their products to the new leaf category, and drops the old flat rows.
-- Guarded by org name like 0008, so it's a no-op anywhere that org doesn't exist.

do $$
declare
  v_org_id uuid;
  v_flat_category record;
  v_parts text[];
  v_part text;
  v_parent_id uuid;
  v_node_id uuid;
begin
  select id into v_org_id from public.organizations where name = 'Mundo Animal Rio 1';

  if v_org_id is null then
    return;
  end if;

  for v_flat_category in
    select id, name from public.product_categories
    where org_id = v_org_id and name like '% > %'
  loop
    v_parts := string_to_array(v_flat_category.name, ' > ');
    v_parent_id := null;
    v_node_id := null;

    foreach v_part in array v_parts loop
      select id into v_node_id
      from public.product_categories
      where org_id = v_org_id
        and name = v_part
        and parent_id is not distinct from v_parent_id;

      if v_node_id is null then
        insert into public.product_categories (org_id, name, parent_id)
        values (v_org_id, v_part, v_parent_id)
        returning id into v_node_id;
      end if;

      v_parent_id := v_node_id;
    end loop;

    update public.products
    set category_id = v_node_id
    where org_id = v_org_id and category_id = v_flat_category.id;

    delete from public.product_categories where id = v_flat_category.id;
  end loop;
end $$;
