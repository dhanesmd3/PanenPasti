# Data

## `harga/cabai_rawit_merah_pihps.csv`

Harga harian **cabai rawit merah** (Rp/kg), 1 Nov 2024 – 6 Nov 2026, 1.546 baris.

| Kolom | Isi |
| --- | --- |
| `tanggal` | Tanggal ISO (hari kerja saja) |
| `wilayah` | `Kab. Garut` atau `Kota Bandung` |
| `tingkat` | `produsen` (harga di petani), `pedagang_besar` (grosir), `pasar_tradisional` (eceran/konsumen) |
| `harga_per_kg` | Rupiah per kg |

**Sumber:** PIHPS Nasional, Bank Indonesia — https://www.bi.go.id/hargapangan, menu Tabel Harga (Produsen, Pedagang Besar, Pasar Tradisional → Berdasarkan Daerah), Provinsi Jawa Barat. Diambil 7 November 2026 dari data tabel yang sama dengan tombol "Download" di halaman tersebut.

**Catatan pemakaian:**

- Situs PIHPS mencantumkan "Hak Cipta © 2022 PIHPS Nasional - Semua Hak Dilindungi". Data ini dipakai untuk keperluan non-komersial (lomba) dengan atribusi ke Bank Indonesia. Atribusi wajib dicantumkan di README utama dan di halaman aplikasi yang menampilkan harga.
- Harga **produsen Kab. Garut** jarang diperbarui: nilainya hanya berubah 18 kali dalam 2 tahun. Gunakan sebagai gambaran tingkat harga petani, bukan pergerakan harian.
- Untuk tingkat produsen di Jawa Barat, PIHPS hanya menyediakan beberapa kabupaten/kota. Kab. Garut tersedia, Kab. Bandung tidak.
- Kab. Garut dan Kota Bandung adalah wilayah berbeda. Selisih harga di antara keduanya menggambarkan jarak harga petani–konsumen, bukan margin satu rantai pasok yang terukur.
