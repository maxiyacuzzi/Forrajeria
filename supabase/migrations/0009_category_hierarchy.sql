-- Categories become a tree: each category can have a parent, so a catalog is
-- organized as e.g. Balanceado -> Gato -> Adulto instead of one flat name per row.

alter table public.product_categories
  add column parent_id uuid references public.product_categories (id) on delete cascade;

create index product_categories_parent_id_idx on public.product_categories (parent_id);

alter table public.product_categories drop constraint product_categories_org_id_name_key;

-- Sibling categories (same parent) must have distinct names. Root categories
-- (parent_id is null) need their own uniqueness check since a plain unique
-- constraint treats every null as distinct from every other null.
create unique index product_categories_org_parent_name_idx
  on public.product_categories (org_id, parent_id, name);

create unique index product_categories_org_root_name_idx
  on public.product_categories (org_id, name)
  where parent_id is null;
