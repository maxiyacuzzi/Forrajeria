-- Product photos, stored in a public Storage bucket. Objects are namespaced by
-- org id as the first path segment (e.g. "<org_id>/<file>"), which the policies
-- below use to keep uploads/edits scoped to the uploader's own organization.

alter table public.products
  add column image_url text;

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "product images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "owner/deposito can upload product images"
  on storage.objects for insert
  with check (
    bucket_id = 'product-images'
    and public.auth_role() in ('owner', 'deposito')
    and (storage.foldername(name))[1] = public.auth_org_id()::text
  );

create policy "owner/deposito can update product images"
  on storage.objects for update
  using (
    bucket_id = 'product-images'
    and public.auth_role() in ('owner', 'deposito')
    and (storage.foldername(name))[1] = public.auth_org_id()::text
  );

create policy "owner/deposito can delete product images"
  on storage.objects for delete
  using (
    bucket_id = 'product-images'
    and public.auth_role() in ('owner', 'deposito')
    and (storage.foldername(name))[1] = public.auth_org_id()::text
  );
