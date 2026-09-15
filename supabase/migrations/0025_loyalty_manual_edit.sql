-- Lets an owner/vendedor manually correct or set a customer's loyalty
-- progress for a product (an off-system sale, fixing a mistake, or crediting
-- progress from before the app tracked it) — this table was writable only
-- through create_sale() (security definer) until now.

create policy "owner/vendedor can manage product loyalty"
  on public.customer_product_loyalty for all
  using (org_id = public.auth_org_id() and public.auth_role() in ('owner', 'vendedor'))
  with check (org_id = public.auth_org_id() and public.auth_role() in ('owner', 'vendedor'));
