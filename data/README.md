# Data

## `kecamatan.csv`

Semua kecamatan di **Kab. Garut** (42) dan **Kota Bandung** (30), beserta titik koordinatnya. Dipakai untuk seed tabel `kecamatan` dan menghitung jarak di matching.

| Kolom | Isi |
| --- | --- |
| `id` | Kode wilayah kecamatan 7 digit (Wikidata P1588), contoh `3205120` = Cikajang |
| `nama` | Nama kecamatan |
| `kab_kota` | `Kab. Garut` atau `Kota Bandung` |
| `lat`, `lng` | Koordinat titik kecamatan (WGS84) |
| `wikidata` | ID item Wikidata, untuk pelacakan sumber |

**Sumber:** [Wikidata](https://www.wikidata.org), lisensi CC0. Diambil 7 November 2026 lewat Wikidata Query Service: item `instance of` kecamatan dengan `located in` Kab. Garut (Q10371) atau Kota Bandung (Q10389).

**Catatan:**

- Koordinat adalah titik representatif dari Wikidata, bukan titik tengah wilayah yang dihitung dari batas wilayah. Cukup untuk perkiraan jarak.
- Jarak garis lurus Garut → Kota Bandung: 26–93 km. Batas `S_jarak` di matching memakai 100 km (PRD bagian 9.1).

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
