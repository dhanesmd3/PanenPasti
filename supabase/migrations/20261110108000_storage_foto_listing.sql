-- PanenPasti · migrasi 9: bucket foto listing (F2, foto opsional)
--
-- Bucket publik: foto panen memang untuk dilihat pembeli, dan URL publiknya
-- disimpan di listings.foto_url. Yang dibatasi adalah siapa yang boleh menulis:
-- pengguna hanya boleh mengunggah ke folder bernama id-nya sendiri.
--
--   supabase.storage.from('foto-listing').upload(`${user.id}/${namaFile}`, file)
--
-- Batas 5 MB, hanya JPEG/PNG/WebP.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'foto-listing',
  'foto-listing',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists foto_listing_unggah_folder_sendiri on storage.objects;
drop policy if exists foto_listing_ubah_folder_sendiri on storage.objects;
drop policy if exists foto_listing_hapus_folder_sendiri on storage.objects;

create policy foto_listing_unggah_folder_sendiri on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'foto-listing'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy foto_listing_ubah_folder_sendiri on storage.objects
  for update to authenticated
  using (
    bucket_id = 'foto-listing'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'foto-listing'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy foto_listing_hapus_folder_sendiri on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'foto-listing'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
