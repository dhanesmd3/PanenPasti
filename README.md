# PanenPasti

> Pre-order hasil panen yang adil, bukan ijon. Menghubungkan UMKM tani dengan UMKM kuliner lewat kalender panen dan asisten AI.

**LOGICODIX 2026 Hackathon** · Kategori **Web** · Subtema **Local MSME & Creative Economy**

- Aplikasi: _(isi URL Vercel)_
- Video demo: _(isi URL YouTube)_

---

## Tim

**Nama tim:** _(isi)_

| Nama | Peran | GitHub |
| --- | --- | --- |
| _(isi)_ | A · Backend & Tech Lead | _(isi)_ |
| _(isi)_ | B · Frontend Penjual | _(isi)_ |
| _(isi)_ | C · Frontend Pembeli & UI Kit | _(isi)_ |
| _(isi)_ | D · AI, Data & Dokumen | @dhanesmd3 |

## Masalah

_(Ringkas dari docs/PRD bagian 2–3, sertakan 2–3 angka dengan tautan sumber.)_

## Solusi

_(Ringkas dari docs/PRD bagian 1.)_

## Target Pengguna

- **Penjual (UMKM tani):** ketua kelompok tani atau admin koperasi.
- **Pembeli (UMKM kuliner):** warung makan, resto kecil, katering.

## Fitur yang Berhasil Diimplementasikan

_(Centang hanya yang benar-benar jalan di commit final.)_

- [ ] Daftar/login dengan peran Penjual atau Pembeli
- [ ] Listing panen (tambah, ubah, hapus)
- [ ] Katalog musiman dengan filter
- [ ] Pre-order dengan stok atomik
- [ ] Matching otomatis berdasarkan tanggal panen, jumlah, dan jarak
- [ ] Prediksi harga dengan rentang
- [ ] AI-1: kebutuhan dengan bahasa bebas
- [ ] AI-2: isi listing otomatis
- [ ] AI-3: penjelasan prediksi harga
- [ ] Alert surplus
- [ ] Status pesanan + notifikasi in-app
- [ ] Pembatalan gagal panen + saran penjual pengganti

## Teknologi

| Lapisan | Teknologi |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Backend & database | Supabase (Auth, PostgreSQL + Row Level Security, Storage) |
| Validasi | Zod |
| Pengujian | Vitest |
| AI | _(isi provider + model final)_ |
| Deploy | Vercel |

## Arsitektur & Alur Data

_(Salin diagram Mermaid dari docs/PRD bagian 10 dan 11, lalu sesuaikan dengan implementasi akhir.)_

## Menjalankan Secara Lokal

Prasyarat: Node.js 20+, npm, akun Supabase. Untuk Supabase lokal: Supabase CLI + Docker.

```bash
git clone https://github.com/dhanesmd3/PanenPasti.git
cd PanenPasti
npm install
cp .env.example .env.local   # lalu isi nilainya
npm run dev
```

Buka http://localhost:3000.

_(Tambahkan langkah migrasi database dan seed data setelah tersedia.)_

### Variabel Lingkungan

Lihat [`.env.example`](.env.example).

| Variabel | Keterangan |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Hanya server, untuk skrip seed |
| `AI_PROVIDER` | `gemini`, `groq`, atau `anthropic` |
| `*_API_KEY`, `*_MODEL` | Kunci dan model untuk provider AI yang dipilih |
| `AI_RATE_LIMIT_PER_HOUR` | Batas panggilan AI per pengguna |
| `NEXT_PUBLIC_APP_URL` | URL aplikasi |

## Akun Demo

| Peran | Email | Password |
| --- | --- | --- |
| Penjual | _(isi)_ | _(isi)_ |
| Pembeli | _(isi)_ | _(isi)_ |

## Penggunaan AI

### Di dalam aplikasi

| Fitur | Provider & model | Bagian kode | Data yang dikirim |
| --- | --- | --- | --- |
| AI-1 Kebutuhan bahasa bebas | _(isi)_ | `app/api/ai/kebutuhan` | Teks kebutuhan + tanggal hari ini. Tanpa nama/nomor HP |
| AI-2 Isi listing otomatis | _(isi)_ | `app/api/ai/listing` | Teks listing + tanggal hari ini |
| AI-3 Penjelasan harga | _(isi)_ | `app/api/ai/penjelasan-harga` | Angka prediksi harga |

Angka harga dihitung oleh kode (`lib/forecast.ts`), bukan oleh AI.

### Dalam proses pengembangan

_(Sebutkan AI coding assistant yang dipakai dan bagian yang dibantu, sesuai ketentuan guidebook.)_

## Atribusi

| Sumber | Dipakai untuk | Lisensi/ketentuan |
| --- | --- | --- |
| [Next.js](https://nextjs.org) via `create-next-app` | Starter project | MIT |
| _(isi dataset harga)_ | Data harga historis | _(isi)_ |
| Foto komoditas dari [Pexels](https://www.pexels.com) (`public/komoditas/`): [cabai rawit](https://www.pexels.com/photo/21273622/) oleh Terrance Barksdale, [cabai merah keriting](https://www.pexels.com/photo/2893882/) oleh Mark Stebnicki, [tomat](https://www.pexels.com/photo/10112127/) oleh Engin Akyurt, [kentang](https://www.pexels.com/photo/7129145/) oleh Michael Burrows, [kubis](https://www.pexels.com/photo/134877/) oleh freestocks.org, [wortel](https://www.pexels.com/photo/20371247/) oleh Javier Balseiro, [bawang merah](https://www.pexels.com/photo/144206/) oleh Miguel Á. Padriñán | Gambar pengganti di katalog saat penjual belum mengunggah foto (dipotong persegi, dikompres ke WebP) | [Lisensi Pexels](https://www.pexels.com/license/): bebas dipakai, atribusi tidak wajib |
| _(isi library/ikon/aset lain)_ | | |

## Dokumen

- [PRD](docs/PRD%20PanenPasti%20v2.md)
- [Pembagian tugas & timeline](docs/Pembagian%20Tugas%20dan%20Timeline.md)
