# Pembagian Tugas & Timeline: PanenPasti

**LOGICODIX 2026 Hackathon** · Kategori Web · Subtema UMKM
Disusun 7 November 2026 · rujukan fitur: [PRD PanenPasti v2.md](PRD%20PanenPasti%20v2.md)

**Prinsip utama:**

- Semua fitur P0 harus jadi **Kamis 12 Nov**.
- Jumat 13 Nov hanya untuk video dan dokumen.
- Sabtu 14 Nov submit, **sebelum siang**.

---

## 1. Tanggal Penting

| Tanggal | Hari | Kegiatan | Catatan |
| --- | --- | --- | --- |
| 7 Nov 2026 | Sabtu | Mentoring & Technical Meeting penyisihan, Hacking Kick-off | **Repo baru boleh dibuat dan kode baru boleh ditulis SETELAH kick-off selesai** |
| 7–14 Nov | Sab–Sab | Hacking Week | Commit rutin setiap hari |
| 12 Nov | Kamis | **Feature freeze internal** | Tidak ada fitur baru setelah malam ini |
| 13 Nov | Jumat | Rekam video, README final, surat orisinalitas | Setelah video direkam, tidak boleh mengubah kode |
| **14 Nov** | Sabtu | **Code freeze & batas submission 23.59 WIB** | Target submit sebelum 12.00 WIB. Hanya boleh satu kali submit |
| 15–20 Nov | Min–Jum | Penilaian penyisihan | Jangan ubah repo atau deployment. Pastikan aplikasi tetap hidup |
| 21 Nov | Sabtu | Pengumuman finalis (Top 8) | Lewat website dan media sosial LOGICODIX |
| 22 Nov | Minggu | Technical Meeting finalis (daring) | Wajib diikuti |
| 23–28 Nov | Sen–Sab | Persiapan final | Slide, latihan pitch, setup localhost |
| 29 Nov | Minggu | **Grand Final luring** + National Tech Seminar | 15 menit per tim: 1' persiapan, 7' presentasi + demo, 3' Q&A, 4' penilaian |

---

## 2. Peran

| Kode | Peran | Tanggung jawab utama | Folder milik |
| --- | --- | --- | --- |
| **A** | Backend & Tech Lead | Repo, Supabase (skema, RLS, fungsi pesanan), API pesanan dan notifikasi, deploy, Supabase lokal | `supabase/`, `app/api/orders`, `app/api/notifikasi`, `lib/supabase/` |
| **B** | Frontend Penjual | Semua halaman penjual: Beranda, Panen Saya, Pesanan Masuk, Harga, Surplus, Gagal Panen | `app/penjual/`, `components/penjual/` |
| **C** | Frontend Pembeli & UI Kit | Landing, login/daftar, komponen dasar, halaman pembeli: Katalog, Cari Pemasok, Pesanan Saya, Notifikasi. Editor video | `app/(publik)/`, `app/pembeli/`, `components/ui/` |
| **D** | AI, Data & Dokumen | Data harga, logika matching dan prediksi, endpoint AI, README, bukti masalah, surat orisinalitas, portal submission | `lib/ai/`, `lib/matching.ts`, `lib/forecast.ts`, `app/api/ai/`, `app/api/match`, `scripts/`, `README.md` |

- Isi nama setiap anggota di tabel di atas.
- Tentukan **Ketua Tim**: dia yang menandatangani Surat Pernyataan Orisinalitas.
- Kalau ada yang sedang ada kuliah atau ujian, tukar tugas di standup pagi. Jangan sampai ada yang hilang seharian tanpa kabar.

---

## 3. Aturan Kerja (wajib dibaca semua)

### 3.1 Git: aturan yang bisa membuat diskualifikasi kalau dilanggar

- [ ] Repo dibuat **setelah kick-off**, oleh A. Semua anggota diundang sebagai collaborator.
- [ ] **Matikan "Allow squash merging" dan "Allow rebase merging"** di Settings → General → Pull Requests. Sisakan "Allow merge commits".
- [ ] Setiap anggota menjalankan `git config pull.rebase false` di laptopnya, supaya tidak ada rebase tanpa sengaja.
- [ ] **Dilarang** `git push --force`, `git rebase`, squash, `commit --amend` setelah push, dan mengubah tanggal commit.
- [ ] Semua commit dari **akun GitHub sendiri** (cek `git config user.email`).
- [ ] Commit kecil dan sering, **minimal 1 commit per orang per hari**. Tidak boleh bulk upload di akhir.
- [ ] Pesan commit pakai awalan: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `chore:`, `test:`.
  - Contoh: `feat: add harvest listing form`, `fix: prevent negative stock on concurrent orders`.
  - Dilarang: "update", "test", "final", "wip".
- [ ] `.env` masuk `.gitignore` dan tidak pernah di-commit. Setiap variabel baru langsung ditambahkan ke `.env.example` tanpa nilai.

### 3.2 Alur branch

1. Buat branch dari `main`: `feat/b-form-listing`, `feat/d-ai-kebutuhan`, dan seterusnya.
2. Buka Pull Request kecil. Minimal 1 anggota lain mengecek (cukup 5 menit).
3. Merge dengan **merge commit**, minimal sekali sehari.
4. Setiap merge ke `main` otomatis ter-deploy di Vercel. Cek hasilnya di URL produksi.

### 3.3 Ritme harian

| Jam (WIB) | Kegiatan | Durasi |
| --- | --- | --- |
| 09.00 | **Standup**: kemarin selesai apa, hari ini apa, ada yang menghambat? | 15 menit |
| 16.00 | Cek singkat di chat grup: apakah target hari ini masih aman? | 5 menit |
| 21.00 | **Checkpoint**: demo bersama dari URL Vercel. Centang target hari ini, catat bug | 30 menit |

Jam bisa digeser sesuai jadwal kuliah. Yang penting ada sinkronisasi pagi dan malam.

### 3.4 Definisi "selesai"

Sebuah tugas dianggap selesai kalau:

- Sudah di-merge ke `main` dan jalan di URL Vercel.
- Bisa dipakai di HP dengan lebar 360px.
- Punya tampilan loading, kosong, dan error.
- Untuk logika (matching, prediksi, fungsi pesanan), ada unit test.

---

## 4. Kontrak Antar-Anggota (disepakati hari ke-1)

Supaya B, C, dan D bisa bekerja paralel tanpa saling menunggu, sepakati bentuk data dan API di hari pertama. Kalau API belum jadi, pakai data tiruan (mock) dengan bentuk yang sama.

**Tipe bersama** disimpan di `types/index.ts`: `Profile`, `Listing`, `Kebutuhan`, `Order`, `OrderStatus`, `Notifikasi`, `HasilMatching`, `Prediksi`. Dibuat oleh A + D.

| Endpoint | Pemilik | Input | Output |
| --- | --- | --- | --- |
| CRUD listing | B (langsung Supabase client + RLS) | — | — |
| `POST /api/orders` | A | `{ listing_id, jumlah_kg, kebutuhan_id? }` | `Order` |
| `PATCH /api/orders/[id]` | A | `{ status, alasan? }` | `Order` |
| `GET /api/notifikasi` | A | — | `Notifikasi[]` |
| `POST /api/listings/[id]/surplus` | A | `{ harga_surplus }` | `Listing` |
| `POST /api/match` | D | `{ komoditas_id, jumlah_kg, tgl_butuh }` | `HasilMatching[]` (listing, skor, alasan) |
| `GET /api/harga/prediksi?komoditas_id=` | D | — | `{ historis[], prediksi[{tanggal, nilai, bawah, atas}], saran }` |
| `POST /api/ai/kebutuhan` | D | `{ teks }` | `{ komoditas, jumlah_kg, tgl_butuh, berulang }` |
| `POST /api/ai/penjelasan-harga` | D | `{ komoditas_id }` | `{ teks }` |
| `POST /api/ai/listing` (P1) | D | `{ teks }` | `{ komoditas, jumlah_kg, tgl_panen, kualitas, harga_per_kg }` |

---

## 5. Rencana Harian

Kotak centang = tugas. **Target akhir hari** dicek bersama di checkpoint 21.00.

### Hari 1: Sabtu, 7 November · Fondasi

**Target akhir hari:** URL Vercel bisa dibuka, setiap anggota sudah punya minimal 1 commit, dan semua keputusan terbuka sudah diputuskan.

**Bersama (setelah kick-off, ±1 jam)**

- [ ] Ikut Mentoring & Technical Meeting.
- [ ] Putuskan: nama tim, nama aplikasi (sementara PanenPasti), komoditas + kabupaten, Ketua Tim, peran A/B/C/D.
- [ ] Sepakati daftar halaman (PRD bagian 4), tipe bersama, dan kontrak API (bagian 4 di atas).
- [ ] Sepakati warna dan font. C mengusulkan.

| A: Backend | B: FE Penjual | C: FE Pembeli & UI Kit | D: AI & Data |
| --- | --- | --- | --- |
| [ ] Buat repo publik/privat setelah kick-off. Atur merge settings (3.1) | [ ] Wireframe 4 layar penjual: Beranda, Panen Saya + form, Pesanan Masuk, Harga (kertas/Figma) | [ ] Wireframe landing + 4 layar pembeli: Katalog, Cari Pemasok, Pesanan Saya, Notifikasi | [ ] Cari dan unduh data harga cabai (Panel Harga Bapanas / PIHPS), minimal 1 tahun |
| [ ] `create-next-app` (TS + Tailwind + App Router), struktur folder, ESLint/Prettier | [ ] Setelah repo siap: layout penjual + navigasi bawah 3 menu (`app/penjual/layout.tsx`) | [ ] Setelah repo siap: token warna/font di Tailwind, komponen `Button`, `Input`, `Card`, `Badge` status | [ ] Buat akun Google AI Studio, **cek batas rate limit di halaman rate-limit AI Studio**, catat di grup |
| [ ] Buat project Supabase, isi `.env`, `.env.example`, `.gitignore` | | | [ ] Daftar kecamatan di kabupaten pilihan + koordinat (lat, lng) dalam CSV |
| [ ] Deploy ke Vercel + set env di Vercel | | | [ ] Hubungi 1–2 petani/koperasi dan 1–2 warung untuk wawancara (jadwalkan ≤ 10 Nov) |
| [ ] Migrasi SQL awal: `profiles`, `kecamatan`, `komoditas`, `listings` (`supabase/migrations/`) | | | [ ] Bersama A: tulis `types/index.ts` |

### Hari 2: Minggu, 8 November · Login & Listing

**Target akhir hari:** penjual bisa daftar, login, dan membuat/mengubah/menghapus listing. Pembeli bisa daftar, login, dan melihat listing di katalog.

| A: Backend | B: FE Penjual | C: FE Pembeli & UI Kit | D: AI & Data |
| --- | --- | --- | --- |
| [ ] Supabase Auth: daftar dengan pilihan peran + trigger membuat baris `profiles` | [ ] Halaman **Panen Saya**: daftar listing milik sendiri | [ ] **Landing page**: masalah, solusi, tombol Masuk/Daftar (angka bukti menyusul di hari 6) | [ ] Bersihkan data harga → CSV → `scripts/import-harga.ts` → tabel `harga_historis` |
| [ ] RLS untuk `profiles` & `listings`: pemilik bisa ubah, semua yang login bisa baca listing | [ ] **Form tambah/ubah listing**: jumlah dengan stepper, satuan kg/kuintal, tanggal cepat ("2 minggu lagi"), harga, kualitas | [ ] Halaman **Daftar/Login**: pilih peran dengan 2 kartu besar (Penjual/Pembeli) | [ ] Seed data dummy realistis: 6–10 penjual di beberapa kecamatan + listing. Label "Data simulasi" |
| [ ] Seed `kecamatan` (dari CSV D) dan `komoditas` | [ ] Hapus listing (dengan konfirmasi) | [ ] Layout pembeli + navigasi | [ ] `lib/ai/provider.ts`: adapter (Gemini + cadangan) dengan `AI_PROVIDER` di env. Endpoint tes sederhana |
| [ ] Helper Supabase client server/browser + `proxy.ts` (pengganti `middleware.ts` di Next.js 16): `/penjual/*` hanya untuk penjual, `/pembeli/*` hanya untuk pembeli | [ ] Upload foto opsional ke Supabase Storage (**boleh dipotong** kalau mepet) | [ ] **Katalog musiman** + filter kecamatan & rentang tanggal | |

### Hari 3: Senin, 9 November · Pre-order & Logika Inti

**Target akhir hari:** pembeli pre-order → stok berkurang → penjual menerima → status berubah di kedua akun. Fungsi matching dan prediksi lulus unit test.

| A: Backend | B: FE Penjual | C: FE Pembeli & UI Kit | D: AI & Data |
| --- | --- | --- | --- |
| [ ] Tabel `orders`, `notifikasi`, `kebutuhan` + RLS | [ ] Halaman **Pesanan Masuk**: kartu pesanan dengan status (warna + ikon + teks) | [ ] **Detail listing** + tombol **Pre-order** (input jumlah, validasi ≤ sisa stok) | [ ] `lib/matching.ts`: filter + skor (PRD bagian 9.1) + alasan skor |
| [ ] Fungsi DB `buat_pesanan` (atomik, cek & kurangi stok) dan `ubah_status` (kembalikan stok saat ditolak/batal, buat notifikasi) | [ ] Tombol **Terima / Tolak / Tandai dikirim** → `PATCH /api/orders/[id]` (pakai mock dulu kalau belum siap) | [ ] Halaman **Pesanan Saya**: daftar + status + tombol Batal (hanya saat Menunggu) + Tandai diterima | [ ] Unit test matching (Vitest): tanggal sama, selisih 7 hari, stok kurang, jarak jauh |
| [ ] `POST /api/orders` + `PATCH /api/orders/[id]` + validasi Zod | | | [ ] `lib/forecast.ts`: tren + musiman + rentang + saran (PRD bagian 9.2) + unit test |
| [ ] Tes: dua pesanan bersamaan tidak membuat stok minus | | | |

### Hari 4: Selasa, 10 November · Matching, Harga & AI

**Target akhir hari:** pembeli mengetik kalimat bebas → form terisi oleh AI → hasil matching muncul dengan skor. Penjual melihat saran harga dari AI.

| A: Backend | B: FE Penjual | C: FE Pembeli & UI Kit | D: AI & Data |
| --- | --- | --- | --- |
| [ ] `GET /api/notifikasi` + tandai dibaca + badge jumlah belum dibaca | [ ] Halaman **Harga**: kartu satu kalimat (dari AI-3) + panah naik/turun | [ ] Halaman **Cari Pemasok**: kotak teks bebas → panggil AI-1 → form terisi (bisa diedit) → tombol Cari | [ ] `POST /api/match` (query kandidat + skor dari `lib/matching.ts`) |
| [ ] Bantu D: query kandidat matching + hitung jarak dari koordinat kecamatan | [ ] "Lihat detail": grafik historis + prediksi + rentang (Recharts), label sumber data | [ ] **Kartu hasil matching**: skor, alasan, harga, jarak, tombol Pre-order | [ ] `GET /api/harga/prediksi` |
| [ ] Rate limit sederhana untuk `/api/ai/*` dan login | [ ] Beranda penjual: jumlah pesanan baru + kartu harga + tombol Tambah Panen | [ ] Label "Dibuat oleh AI — periksa sebelum disimpan" | [ ] **AI-1** `POST /api/ai/kebutuhan` dan **AI-3** `POST /api/ai/penjelasan-harga`: prompt dengan tanggal hari ini + satuan lokal, validasi Zod, fallback |
| | | | [ ] Uji AI-1 dengan 15–20 kalimat (kuintal, "sekilo", "tiap Senin", "akhir bulan"). Simpan sebagai test case |

### Hari 5: Rabu, 11 November · Alur Lengkap

**Target akhir hari:** **seluruh skenario video (PRD bagian 15) bisa dijalankan dari awal sampai akhir di URL Vercel tanpa error.**

| A: Backend | B: FE Penjual | C: FE Pembeli & UI Kit | D: AI & Data |
| --- | --- | --- | --- |
| [ ] `POST /api/listings/[id]/surplus` → notifikasi ke pembeli di kabupaten yang sama | [ ] Tombol **Tandai Surplus** + input harga khusus | [ ] Halaman **Notifikasi** (dipakai kedua peran) | [ ] Matching ulang: 3 penjual pengganti untuk pesanan yang gagal panen |
| [ ] Pembatalan gagal panen (status + alasan) → trigger saran pengganti | [ ] Alur **Batalkan karena gagal panen**: pilih alasan, konfirmasi | [ ] **Alert surplus** di beranda pembeli | [ ] **AI-2** `POST /api/ai/listing` (P1, hanya kalau AI-1/3 sudah stabil) + B memasang tombol "Isi dengan AI" |
| [ ] Kontak `wa.me` hanya terlihat setelah Dikonfirmasi (view/RLS) | [ ] Tampilkan kontak pembeli setelah konfirmasi | [ ] Tampilan **penjual pengganti** di Pesanan Saya | [ ] Wawancara lapangan (paling lambat hari ini). Rangkum 2–3 kutipan |
| [ ] P1: auto-batal setelah 48 jam (**potong kalau mepet**) | | [ ] Halaman **Tentang & Privasi** (teks dari D) | [ ] Mulai `README.md`: struktur + diagram mermaid dari PRD |
| **21.00: run-through penuh skenario video bersama** | | | |

### Hari 6: Kamis, 12 November · FEATURE FREEZE

**Target akhir hari:** semua P0 stabil, tidak ada bug kritis, akun demo siap, draf README lengkap. **Setelah 23.59 tidak ada fitur baru.**

| Jam | Aturan |
| --- | --- |
| s.d. 12.00 | Selesaikan sisa P0 yang belum jadi |
| 12.00–21.00 | **Hanya perbaikan bug dan polish** |
| 21.00 | QA bersama: setiap orang menjalankan skenario video di HP sendiri dan mencatat bug |
| 21.00–23.59 | Perbaiki bug dari QA. Setelah itu **freeze** |

| A: Backend | B: FE Penjual | C: FE Pembeli & UI Kit | D: AI & Data |
| --- | --- | --- | --- |
| [ ] Uji keamanan: login sebagai pengguna X, coba ubah listing/pesanan pengguna Y. Harus ditolak | [ ] Polish UI penjual: tombol ≥ 48px, teks ≥ 16px, bahasa sehari-hari | [ ] Polish UI pembeli + **landing diisi angka bukti** (PRD bagian 3) dengan tautan sumber | [ ] **Akun demo**: `penjual.demo@...` dan `pembeli.demo@...` + password, dicatat di README |
| [ ] **Uji Supabase lokal** (CLI + Docker): migrasi + seed jalan di laptop. Skrip seed harus sudah di repo | [ ] Uji di HP Android asli (360px): loading, kosong, error | [ ] Uji di HP asli + cek kontras warna & label form | [ ] README lengkap: semua poin wajib (PRD bagian 14), dokumentasi AI, atribusi, cara instal |
| [ ] Seed data demo final: nama realistis, label "Data simulasi", data siap untuk skenario video | [ ] Cek semua teks berbahasa Indonesia | [ ] Siapkan rekaman: 2 browser (normal + incognito), zoom layar, perekam layar | [ ] **Naskah video final** (PRD bagian 15) dengan timestamp |
| [ ] Cek kuota Supabase & AI + env Vercel benar | | | [ ] Unduh template Surat Pernyataan Orisinalitas dari panitia |

### Hari 7: Jumat, 13 November · Video & Dokumen

**Target akhir hari:** video terunggah di YouTube, README final, surat orisinalitas PDF bertanda tangan, semua tautan dicek.

**Urutan wajib:**

1. **s.d. 10.00:** perbaikan bug kritis terakhir (hanya A, atas persetujuan tim).
2. **10.00:** **commit kode final.** A mencatat hash commit-nya di grup.
3. **Rekam video dari deployment commit tersebut.**
4. **Setelah video direkam, tidak ada lagi commit kode.** Yang boleh hanya `docs:` (README). Kalau terpaksa mengubah kode, video harus direkam ulang.

| A: Backend | B: FE Penjual | C: FE Pembeli & UI Kit | D: AI & Data |
| --- | --- | --- | --- |
| [ ] Pastikan URL Vercel = commit final (cek di dashboard Vercel) | [ ] Jadi "pengguna penjual" saat rekaman | [ ] **Rekam video** satu kali utuh, mengikuti naskah | [ ] README final (`docs:` commit) + commit hash final |
| [ ] Pastikan repo **publik** dan README terbaca | [ ] Cek durasi 3:00–5:00 + semua adegan wajib ada | [ ] **Sunting:** potong waktu tunggu, tambah teks/narasi/musik. Jangan mengubah hasil yang tampil | [ ] **Surat Orisinalitas**: isi → Ketua tanda tangan → meterai Rp10.000/e-meterai → PDF |
| [ ] Cek aplikasi bisa dibuka di incognito tanpa akses khusus | [ ] Upload ke YouTube (**Unlisted**), cek bisa diputar tanpa login | | [ ] Draf slide pitch (10–12 slide) |

### Hari 8: Sabtu, 14 November · Submit

**Target:** submission terkirim **sebelum 12.00 WIB**. Batas resmi 23.59 WIB, tapi jangan mepet.

| Jam | Kegiatan | PIC |
| --- | --- | --- |
| 08.00 | Cek ulang semua tautan dari HP lain/incognito: repo, aplikasi, video, PDF | Semua |
| 09.00 | Jalani **checklist final** (bagian 6) bersama lewat call | Semua |
| 10.00 | Isi portal submission: link repo, link video, PDF surat, commit hash. **Dua orang mengecek sebelum klik kirim** | D (dicek A) |
| ≤ 12.00 | **KIRIM.** Screenshot bukti submit dan simpan di grup | D |
| setelahnya | **Jangan push apa pun ke repo dan jangan redeploy.** Hanya boleh memulihkan layanan yang mati tanpa mengubah kode, fitur, atau data | Semua |
| 23.59 | Code freeze resmi | — |

### Setelah submit: 15–29 November

| Tanggal | Kegiatan | PIC |
| --- | --- | --- |
| 15–20 Nov | Cek setiap hari: aplikasi bisa dibuka, kuota AI & Supabase aman, video masih ada | A |
| 15–20 Nov | Slide pitch final + dokumen jawaban Q&A (PRD bagian 15) | D + C |
| 21 Nov (Sab) | Pengumuman finalis | — |
| 22 Nov (Min) | Technical Meeting finalis: catat aturan presentasi dan live demo | Semua |
| 23–25 Nov | Setup **localhost** di laptop presentasi (dari commit final) + cadangan Supabase lokal. Uji tanpa internet | A |
| 23–28 Nov | Latihan pitch minimal 3 kali dengan timer 7 menit (2,5' presentasi + 4,5' demo) + simulasi Q&A 3 menit | Semua |
| 28 Nov (Sab) | Gladi bersih penuh di laptop final. Siapkan charger, adaptor HDMI, video demo offline sebagai cadangan | Semua |
| **29 Nov (Min)** | **Grand Final** | Semua |

---

## 6. Checklist Final (pakai tanggal 14 Nov pagi)

- [ ] Repo publik, berisi semua kode, README.md ada di root
- [ ] Tidak ada `.env` atau API key di riwayat repo (cari kata `key`, `secret`, `sk-` di GitHub)
- [ ] `.env.example` lengkap
- [ ] Semua commit dari akun anggota, pesan commit sesuai format, tidak ada force push
- [ ] URL aplikasi bisa dibuka di incognito, akun demo bisa login
- [ ] Fitur AI berjalan (cek kuota). Fallback jalan kalau AI mati
- [ ] Video YouTube 3:00–5:00, Unlisted/Public, bisa diputar tanpa login, direkam dari commit final
- [ ] Surat orisinalitas PDF, bertanda tangan Ketua, bermeterai
- [ ] README memuat semua poin wajib (PRD bagian 14), termasuk dokumentasi AI dan atribusi
- [ ] Commit hash final sudah dicatat

---

## 7. Kalau Telat: Urutan Fitur yang Dipotong

Potong dari atas ke bawah. **Jangan potong** yang ada di daftar "wajib dipertahankan".

1. F12 Pesan ulang
2. F11 Gabung beberapa penjual
3. F10 Dashboard pendapatan/riwayat
4. Auto-batal 48 jam
5. Upload foto listing
6. AI-2 Isi listing otomatis
7. Filter katalog selain komoditas

**Wajib dipertahankan:**

- Login dua peran
- Listing
- Pre-order + status
- Matching dengan skor
- Prediksi harga + AI-3
- AI-1
- Alert surplus
- Notifikasi in-app

**Kalau satu anggota berhalangan lebih dari setengah hari:** A dan D mengambil alih tugas backend/logika, B dan C saling menutupi tugas frontend. Laporkan di standup.

---

## 8. Struktur Folder yang Disarankan

```
app/
  (publik)/            landing, masuk, daftar, tentang        → C
  penjual/             beranda, panen, pesanan, harga         → B
  pembeli/             beranda, katalog, cari, pesanan        → C
  notifikasi/                                                 → C
  api/
    orders/            POST, PATCH                            → A
    notifikasi/                                               → A
    listings/[id]/surplus/                                    → A
    match/                                                    → D
    harga/prediksi/                                           → D
    ai/                kebutuhan, penjelasan-harga, listing   → D
components/
  ui/                  Button, Input, Card, Badge             → C
  penjual/                                                    → B
  pembeli/                                                    → C
lib/
  supabase/            client server & browser                → A
  ai/provider.ts       adapter LLM                            → D
  matching.ts (+ test)                                        → D
  forecast.ts (+ test)                                        → D
types/index.ts                                                → A + D
supabase/
  migrations/                                                 → A
  seed.sql                                                    → A + D
scripts/import-harga.ts                                       → D
README.md                                                     → D
.env.example                                                  → semua
```
