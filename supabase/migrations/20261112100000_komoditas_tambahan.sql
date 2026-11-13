-- PanenPasti · migrasi 10: komoditas tambahan
-- Hortikultura yang banyak ditanam di Kab. Garut, supaya katalog tidak hanya
-- berisi cabai rawit. Prediksi harga dan AI-3 tetap hanya untuk cabai rawit
-- merah (id 1), satu-satunya komoditas yang punya data harga PIHPS di repo.
--
-- Harus sama dengan lib/komoditas.ts (dicek oleh lib/komoditas.test.ts).
-- Aman dijalankan ulang (upsert).

insert into public.komoditas (id, nama, satuan)
values
  (2, 'Cabai Merah Keriting', 'kg'),
  (3, 'Tomat', 'kg'),
  (4, 'Kentang', 'kg'),
  (5, 'Kubis', 'kg'),
  (6, 'Wortel', 'kg'),
  (7, 'Bawang Merah', 'kg')
on conflict (id) do update
  set nama = excluded.nama,
      satuan = excluded.satuan;
