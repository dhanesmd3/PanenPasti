-- Dijalankan otomatis oleh `npx supabase db reset` setelah semua migrasi.
--
-- Sengaja tidak berisi data:
--   * Kecamatan dan komoditas sudah dipasang oleh migrasi data_referensi, karena
--     project cloud juga membutuhkannya (seed.sql hanya berjalan di lokal).
--   * Akun, profil, dan listing simulasi dibuat oleh `npm run seed`
--     (scripts/seed-simulasi.mjs). Akun harus dibuat lewat Supabase Auth supaya
--     kata sandinya di-hash dengan benar, dan itu tidak bisa dilakukan dari SQL.
--
-- Urutan menyiapkan database lokal:
--   npx supabase db reset
--   npm run seed
--   npm run impor:harga      (opsional)

select 1;
