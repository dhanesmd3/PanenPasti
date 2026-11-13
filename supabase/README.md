# Backend PanenPasti

Dokumen kerja untuk bagian A: database, hak akses, fungsi pesanan, dan API. Rujukan fitur ada di [PRD](../docs/PRD%20PanenPasti%20v2.md), kontrak antar-anggota di [Pembagian Tugas](../docs/Pembagian%20Tugas%20dan%20Timeline.md) bagian 4.

Isi folder:

| Path | Isi |
| --- | --- |
| `migrations/` | Skema, RLS, trigger, dan fungsi. Dijalankan berurutan menurut nama file |
| `config.toml` | Konfigurasi Supabase lokal (CLI + Docker) |
| `seed.sql` | Dijalankan `supabase db reset`. Kosong dengan sengaja, lihat komentar di dalamnya |
| `tests/*.test.ts` | Test SQL yang ikut `npm test`, tanpa Docker dan tanpa jaringan |
| `tests/uji-supabase.mjs` | Uji terhadap project Supabase sungguhan (`npm run uji:supabase`) |

---

## 1. Menyiapkan project Supabase (cloud)

1. Buat project di [supabase.com](https://supabase.com). Pilih region Singapore.
2. Salin `.env.example` menjadi `.env.local`, lalu isi dari **Project Settings → API**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: key `anon`. Di project baru namanya *publishable key*; keduanya bisa dipakai di sini
   - `SUPABASE_SERVICE_ROLE_KEY`: key `service_role` (atau *secret key*). Hanya untuk skrip di laptop; jangan diberi awalan `NEXT_PUBLIC_`
3. Pasang migrasi. Pilih salah satu cara:

   **Lewat CLI**

   ```bash
   npx supabase login
   ```

   ```bash
   npx supabase link --project-ref <ref-project>
   ```

   ```bash
   npx supabase db push
   ```

   **Lewat SQL Editor** (tanpa CLI): buka setiap file di `migrations/` sesuai urutan nama, tempel ke SQL Editor, jalankan. Sembilan file, dari `20261110100000_skema_dasar.sql` sampai `20261110108000_storage_foto_listing.sql`.

4. Atur Auth di dashboard:
   - **Authentication → Sign In / Providers → Email**: matikan *Confirm email*. Tanpa ini, pendaftar baru tidak bisa langsung masuk dan demo bergantung pada kiriman email. Minimum password length: 8.
   - **Authentication → URL Configuration**: Site URL diisi URL Vercel.
5. Isi data simulasi dan akun demo:

   ```bash
   npm run seed
   ```

   Kalau hanya butuh dua akun demo tanpa menyentuh listing:

   ```bash
   npm run akun:demo
   ```

   Keduanya membuat `penjual.demo@example.com` dan `pembeli.demo@example.com` yang langsung aktif. Akun yang sudah ada disetel ulang kata sandinya dan dikonfirmasi emailnya, jadi perintah ini juga memperbaiki akun demo yang tidak bisa dipakai masuk. Kata sandinya `DEMO_PASSWORD` di `.env.local` (bawaan `PanenPasti-Demo-2026`). Skrip berhenti dengan petunjuk kalau Supabase tidak bisa dihubungi atau migrasi belum dipasang.

   Tombol **Coba akun demo** (Penjual / Pembeli) di halaman Masuk muncul kalau `DEMO_PASSWORD` juga diisi di server. Di Vercel, tambahkan env itu lalu deploy ulang, karena halaman Masuk dibangun saat build. Kata sandinya tetap di server; browser hanya memanggil `POST /api/auth/demo` dengan `{ "peran": "penjual" }`.

6. Opsional, impor harga PIHPS ke tabel `harga_historis`:

   ```bash
   npm run impor:harga
   ```

7. Periksa hasilnya di database sungguhan:

   ```bash
   npm run uji:supabase
   ```

   Skrip ini membuat empat akun sementara, menguji profil, RLS, pesanan bersamaan, alur status, kontak, dan surplus, lalu menghapus akun-akun itu lagi.

Akun jangan dibuat lewat tombol *Add user* di dashboard. Tombol itu tidak mengirim metadata peran, sehingga trigger profil menolak dan dashboard hanya menampilkan "Database error". Buat akun lewat halaman Daftar, `POST /api/auth/daftar`, atau `npm run seed`.

### Deploy ke Vercel

Environment variables yang wajib di Vercel (Production dan Preview): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`, `AI_PROVIDER` beserta key dan model provider yang dipakai, `AI_RATE_LIMIT_PER_HOUR`. Opsional: `DEMO_PASSWORD` (tombol akun demo), `NEXT_PUBLIC_VIDEO_TUTORIAL_PENJUAL` dan `NEXT_PUBLIC_VIDEO_TUTORIAL_PEMBELI` (video di overlay tutorial). `SUPABASE_SERVICE_ROLE_KEY` tidak dibutuhkan aplikasi yang berjalan, jadi tidak perlu dipasang di Vercel.

## 2. Supabase lokal (cadangan Grand Final)

Butuh Docker Desktop yang sedang menyala.

```bash
npx supabase start
```

```bash
npx supabase db reset
```

```bash
npx supabase status
```

Salin `API URL`, `anon key`, dan `service_role key` dari keluaran `status` ke `.env.local`, lalu jalankan `npm run seed` (atau `npm run akun:demo`) dan `npm run dev`. Studio lokal ada di http://localhost:54323.

`config.toml` ditulis tangan dan belum pernah dijalankan dengan CLI. Kalau `supabase start` menolak salah satu barisnya, hapus file itu, jalankan `npx supabase init`, lalu pindahkan tiga pengaturan `[auth]` di dalamnya ke file baru.

---

## 3. Tabel dan hak akses

RLS aktif di semua tabel. Tamu (belum login) hanya bisa membaca `kecamatan`, `komoditas`, dan `harga_historis`.

| Tabel | Baca | Tulis dari klien | Catatan |
| --- | --- | --- | --- |
| `kecamatan`, `komoditas`, `harga_historis` | Semua orang | Tidak bisa | Data referensi |
| `profiles` | Semua yang login, **kecuali kolom `no_hp`** | Ubah `nama`, `nama_usaha`, `kecamatan_id`, `no_hp` milik sendiri | Peran tidak bisa diganti. Baris dibuat trigger saat akun dibuat |
| `listings` | Semua yang login | Penjual: tambah, ubah, hapus milik sendiri | `sisa_kg`, `is_surplus`, `harga_surplus` dijaga server |
| `kebutuhan` | Pemilik | Pembeli: tambah, ubah, hapus milik sendiri | |
| `orders` | Pembeli pesanan itu dan penjual pemilik listing | Tidak bisa | Hanya lewat `buat_pesanan` / `ubah_status` |
| `notifikasi` | Pemilik | Hanya kolom `dibaca` | Dibuat oleh fungsi database |

Bucket Storage `foto-listing` bersifat publik untuk dibaca. Pengguna hanya bisa mengunggah ke folder bernama id-nya sendiri, maksimal 5 MB, JPEG/PNG/WebP.

### Fungsi database

| Fungsi | Dipanggil oleh | Yang dikerjakan |
| --- | --- | --- |
| `buat_pesanan(p_listing_id, p_jumlah_kg, p_kebutuhan_id?)` | Pembeli | Kunci baris listing, cek stok, kurangi `sisa_kg`, buat pesanan `menunggu`, notifikasi ke penjual |
| `ubah_status(p_order_id, p_status_baru, p_alasan?)` | Kedua pihak | Cek perpindahan dan pelakunya, kembalikan stok bila batal, notifikasi ke pihak lawan, saran pengganti saat gagal panen |
| `tandai_surplus(p_listing_id, p_harga_surplus)` | Penjual | Pasang harga surplus, notifikasi ke pembeli di sekitar penjual |
| `batal_surplus(p_listing_id)` | Penjual | Lepas tanda surplus, tarik notifikasi yang belum dibaca |
| `kontak_pesanan(p_order_id?)` | Kedua pihak | Nomor HP pihak lawan, hanya untuk pesanan Dikonfirmasi, Dikirim, Selesai |
| `profil_saya()` | Pengguna login | Profil sendiri, termasuk `no_hp` |
| `batalkan_pesanan_kedaluwarsa()` | Route handler | Batalkan pesanan `menunggu` yang lebih dari 48 jam |

Setiap fungsi berjalan dalam satu transaksi. Galat bisnis memakai SQLSTATE `PPxxx` dengan pesan berbahasa Indonesia; tiga digit terakhir adalah status HTTP yang dikirim API (`PP409` menjadi 409).

### Status pesanan

| Dari | Ke | Pelaku | Stok | Catatan |
| --- | --- | --- | --- | --- |
| menunggu | dikonfirmasi | penjual | tetap | Kontak kedua pihak terbuka |
| menunggu | ditolak | penjual | kembali | Alasan opsional |
| menunggu | dibatalkan | pembeli | kembali | Alasan opsional |
| dikonfirmasi | dikirim | penjual | tetap | |
| dikonfirmasi | gagal_panen | penjual | kembali | Alasan wajib. Pembeli diberi tahu kalau ada penjual pengganti |
| dikirim | selesai | pembeli | tetap | |

Tabel yang sama ada di [`lib/pesanan.ts`](../lib/pesanan.ts) (`TRANSISI`), dan test membandingkan keduanya untuk semua kombinasi.

---

## 4. Panduan untuk B dan C

### Client Supabase

```ts
// komponen "use client"
import { buatSupabaseBrowser } from "@/lib/supabase/client";
const supabase = buatSupabaseBrowser();

// server component / route handler
import { buatSupabaseServer, sesiOpsional } from "@/lib/supabase/server";
```

`proxy.ts` sudah menjaga rute: `/penjual/*` hanya untuk penjual, `/pembeli/*` hanya untuk pembeli, `/notifikasi` untuk yang sudah login. Pengguna yang belum login diarahkan ke `/masuk?lanjut=<path asal>`, dan pengguna yang sudah login tidak bisa membuka `/masuk` atau `/daftar`.

### Listing (B, langsung lewat Supabase client)

```ts
// tambah
await supabase.from("listings").insert({
  komoditas_id: 1,
  jumlah_kg: 500,
  harga_per_kg: 62000,
  tgl_panen: "2026-12-01",
  kualitas: "Super",
  status: "estimasi", // atau "siap"
});

// ubah
await supabase.from("listings").update({ harga_per_kg: 60000 }).eq("id", id);

// hapus
await supabase.from("listings").delete().eq("id", id);
```

Aturan yang dijalankan database:

- `penjual_id` dan `sisa_kg` diisi server. Nilai kiriman klien untuk `sisa_kg`, `is_surplus`, dan `harga_surplus` diabaikan tanpa galat.
- `jumlah_kg` lebih dari 0 sampai 100.000 kg, `harga_per_kg` Rp1.000 sampai Rp1.000.000, `tgl_panen` tidak boleh di masa lalu.
- Mengubah `jumlah_kg` ikut menggeser `sisa_kg`. Jumlah tidak bisa diturunkan di bawah yang sudah dipesan (galat `PP409`).
- `sisa_kg` mencapai 0 membuat status menjadi `habis`. Kalau stok kembali karena pesanan batal, status kembali ke `siap` atau `estimasi`.
- Listing yang sudah punya pesanan tidak bisa dihapus (`PP409`). Tawarkan "tutup panen" dengan mengubah status menjadi `habis`.
- Surplus hanya lewat `POST /api/listings/[id]/surplus`, supaya notifikasi ikut terkirim.

Galat dari Supabase client punya `error.code` dan `error.message`. Untuk kode `PPxxx`, `error.message` sudah berupa kalimat Indonesia yang bisa langsung ditampilkan.

Foto listing:

```ts
const path = `${user.id}/${crypto.randomUUID()}.jpg`;
await supabase.storage.from("foto-listing").upload(path, file);
const { data } = supabase.storage.from("foto-listing").getPublicUrl(path);
// simpan data.publicUrl ke listings.foto_url
```

### Profil

Jangan memakai `select("*")` pada `profiles`: kolom `no_hp` tidak bisa dibaca klien dan query akan ditolak. Sebut kolomnya (`id, peran, nama, nama_usaha, kecamatan_id`), atau pakai `GET /api/profil` untuk profil sendiri.

### Kebutuhan (C)

```ts
const { data } = await supabase
  .from("kebutuhan")
  .insert({
    komoditas_id: 1,
    jumlah_kg: 20,
    tgl_butuh: "2026-11-23",
    berulang: "mingguan:senin", // atau null
    teks_asli: "butuh 20 kg cabai rawit tiap Senin",
    dibuat_ai: true,
  })
  .select("id")
  .single();
// data.id dikirim sebagai kebutuhan_id ke POST /api/orders
```

---

## 5. API

Semua endpoint di bawah memakai cookie sesi, jadi cukup `fetch("/api/...")` dari halaman yang sama. Body dan respons berupa JSON.

Respons gagal selalu berbentuk:

```json
{ "error": "Stok tidak cukup. Sisa stok 40 kg.", "kode": "PP409" }
```

`error` berupa kalimat Indonesia yang boleh langsung ditampilkan. `kode` tidak selalu ada.

| Status | Arti |
| --- | --- |
| 400 | Body atau parameter tidak valid |
| 401 | Belum login atau sesi habis |
| 403 | Login, tetapi bukan pihak yang berhak |
| 404 | Tidak ada, atau bukan milik pengguna |
| 409 | Bentrok dengan keadaan sekarang: stok kurang, status sudah berubah |
| 422 | Data ditolak aturan bisnis |
| 429 | Terlalu banyak percobaan. Header `Retry-After` berisi detik |
| 503 | Supabase belum dikonfigurasi |

### Akun

**`POST /api/auth/daftar`**

```json
{
  "email": "warung.siti@example.com",
  "password": "minimal-8-karakter",
  "peran": "pembeli",
  "nama": "Siti Nurhaliza",
  "nama_usaha": "Warung Nasi Teh Siti",
  "kecamatan_id": 3273240,
  "no_hp": "081200000201"
}
```

Sukses `201`: `{ "ok": true, "peran": "pembeli", "perlu_konfirmasi_email": false, "lanjut": "/pembeli" }`. Arahkan pengguna ke `lanjut`. `nama_usaha` opsional. Nomor HP boleh ditulis `0812...`, `+62 812...`, atau `62812...`. Daftar kecamatan untuk dropdown bisa dibaca dari tabel `kecamatan` tanpa login.

**`POST /api/auth/masuk`** dengan body `{ "email", "password", "lanjut"? }`. Sukses: `{ "ok": true, "peran": "penjual", "lanjut": "/penjual" }`. Teruskan nilai `?lanjut=` dari URL halaman Masuk ke field `lanjut`; server hanya menerima path yang sesuai peran. Dibatasi 10 percobaan per akun dan 60 per IP dalam 15 menit.

**`POST /api/auth/demo`** dengan body `{ "peran": "penjual" | "pembeli", "lanjut"? }`. Masuk ke akun demo peran itu memakai `DEMO_PASSWORD` dari env server. Sukses sama dengan `/api/auth/masuk`. `404` kalau `DEMO_PASSWORD` kosong, `503` kalau akun demo belum dibuat (jalankan `npm run akun:demo`).

**`POST /api/auth/keluar`** tanpa body. Sukses: `{ "ok": true }`.

**`GET /api/profil`** mengembalikan `Profile` ditambah `email`, dengan `no_hp` terisi.

**`PATCH /api/profil`** dengan sebagian dari `{ "nama", "nama_usaha", "kecamatan_id", "no_hp" }`. Mengembalikan profil terbaru.

### Pesanan

**`POST /api/orders`**

```json
{ "listing_id": "uuid", "jumlah_kg": 20, "kebutuhan_id": "uuid atau tidak dikirim" }
```

Sukses `201`: `Order` dengan status `menunggu`. Stok listing langsung berkurang dan penjual mendapat notifikasi. Harga per kg dikunci saat memesan (harga surplus kalau listing sedang surplus).

**`GET /api/orders?status=menunggu,dikonfirmasi&listing_id=<uuid>&batas=50`** mengembalikan `PesananLengkap[]`, terbaru dulu. Pembeli menerima pesanannya; penjual menerima pesanan di listing miliknya. Semua parameter opsional.

```ts
interface PesananLengkap extends Order {
  total_harga: number;
  listing: Listing;
  penjual: { id; nama; nama_usaha; kecamatan_id };
  pembeli: { id; nama; nama_usaha; kecamatan_id };
  kontak: { nama; nama_usaha; no_hp; wa_url } | null; // pihak lawan, mulai Dikonfirmasi
  peran_saya: "penjual" | "pembeli";
  aksi: OrderStatus[]; // status berikutnya yang boleh dipilih pengguna ini
}
```

`aksi` dipakai untuk menentukan tombol: penjual pada pesanan `menunggu` menerima `["dikonfirmasi", "ditolak"]`, pembeli menerima `["dibatalkan"]`. `kontak.wa_url` sudah berbentuk `https://wa.me/62...`.

**`GET /api/orders/[id]`** mengembalikan satu `PesananLengkap`.

**`PATCH /api/orders/[id]`**

```json
{ "status": "gagal_panen", "alasan": "tanaman terserang patek" }
```

Sukses: `Order` dengan status baru. `alasan` wajib untuk `gagal_panen`, opsional untuk `ditolak` dan `dibatalkan`. Perpindahan yang tidak sah dijawab `409`, pelaku yang salah `403`.

Untuk penjual pengganti setelah gagal panen, panggil `POST /api/match` dengan `kecualikan_listing: [order.listing_id]` dan `batas: 3`.

### Notifikasi

**`GET /api/notifikasi?belum_dibaca=1&batas=50`** mengembalikan `Notifikasi[]`, terbaru dulu. Header `X-Belum-Dibaca` berisi jumlah yang belum dibaca. `order_id` terisi untuk notifikasi pesanan, `listing_id` terisi untuk semua tipe yang terkait listing, termasuk `surplus`.

**`GET /api/notifikasi/jumlah`** mengembalikan `{ "belum_dibaca": 3 }`. Dipakai untuk badge.

**`PATCH /api/notifikasi`** dengan body `{ "ids": ["uuid", ...] }`, atau `{}` untuk menandai semua. Mengembalikan `{ "diperbarui": 2, "belum_dibaca": 1 }`.

| Tipe | Penerima | Kapan |
| --- | --- | --- |
| `pesanan_baru` | Penjual | Pembeli memesan |
| `status_berubah` | Pihak lawan | Setiap perpindahan status, termasuk batal otomatis 48 jam |
| `pengganti_tersedia` | Pembeli | Gagal panen dan ada penjual lain dalam rentang 7 hari |
| `surplus` | Pembeli di sekitar penjual | Penjual menandai surplus |

### Surplus

**`POST /api/listings/[id]/surplus`** dengan body `{ "harga_surplus": 52000 }`. Harga harus di bawah harga normal. Mengembalikan `Listing` dengan `is_surplus: true`.

**`DELETE /api/listings/[id]/surplus`** melepas tanda surplus. Mengembalikan `Listing`.

---

## 6. Keputusan yang perlu diketahui tim

**Sasaran notifikasi surplus.** PRD menulis "pembeli di kabupaten yang sama". Di MVP penjual ada di Kab. Garut dan pembeli di Kota Bandung, jadi aturan itu tidak akan mengirim notifikasi ke siapa pun. Yang dipakai: pembeli di kab/kota yang sama **atau** berjarak sampai 100 km dari kecamatan penjual, sama dengan batas jarak matching. Semua kecamatan Garut berada di bawah 100 km dari semua kecamatan Kota Bandung (ada test-nya).

**`profiles.kecamatan_id` boleh kosong di database.** Skrip seed membuat akun dengan metadata `peran` dan `nama` saja, baru kemudian mengisi profil lengkap. Pendaftaran lewat API tetap mewajibkan kecamatan. Tipe `Profile.kecamatan_id` tidak diubah.

**Tambahan di `types/index.ts`.** `Notifikasi.listing_id` (opsional), `ProfilPublik`, `KontakPesanan`, `PesananLengkap`, `GalatApi`. Tidak ada tipe lama yang berubah bentuk.

**Batal otomatis 48 jam.** Tidak memakai penjadwal. Fungsi `batalkan_pesanan_kedaluwarsa()` dipanggil setiap kali pesanan atau notifikasi dibaca lewat API. Cara menjadwalkannya dengan `pg_cron` ada di komentar migrasi `20261110107000`.

**Login dan daftar lewat server.** Rate limit hanya bisa dipasang kalau percobaan login melewati server, jadi halaman Masuk dan Daftar sebaiknya memanggil `/api/auth/*`, bukan `supabase.auth.signInWithPassword` dari browser.

**Rate limit disimpan di memori.** Hitungannya per instance server, sama seperti pembatas AI di `lib/rate-limit.ts`. Supabase Auth punya pembatas sendiri di belakangnya.

---

## 7. Pengujian

```bash
npm test
```

Test di `supabase/tests/*.test.ts` menjalankan file migrasi asli di Postgres yang hidup di dalam proses test (PGlite), di atas tiruan kecil skema `auth` dan `storage` milik Supabase (`tests/tiruan-supabase.sql`). Yang dicakup: trigger profil, aturan listing, semua kombinasi perpindahan status, stok, notifikasi, kontak, surplus, dan hak akses tiap role sampai tingkat kolom. `hak-akses.test.ts` membaca katalog Postgres, sehingga tabel baru tanpa RLS atau fungsi baru yang bisa dipanggil tamu langsung menggagalkan test.

PGlite hanya punya satu koneksi. Uji dua transaksi yang benar-benar bersamaan dijalankan terhadap Supabase sungguhan:

```bash
npm run uji:supabase
```

Menambah migrasi baru: buat file dengan cap waktu yang lebih besar, jangan mengubah file yang sudah terpasang di cloud.
