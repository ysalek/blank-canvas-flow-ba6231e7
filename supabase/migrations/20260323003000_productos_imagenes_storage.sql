alter table public.productos
add column if not exists imagen_storage_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'productos',
  'productos',
  true,
  4194304,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Productos public read" on storage.objects;
create policy "Productos public read"
on storage.objects
for select
using (bucket_id = 'productos');

drop policy if exists "Productos upload own folder" on storage.objects;
create policy "Productos upload own folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'productos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Productos update own folder" on storage.objects;
create policy "Productos update own folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'productos'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'productos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Productos delete own folder" on storage.objects;
create policy "Productos delete own folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'productos'
  and auth.uid()::text = (storage.foldername(name))[1]
);
