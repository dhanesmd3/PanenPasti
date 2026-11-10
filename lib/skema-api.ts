// Skema Zod untuk body endpoint milik A (orders, notifikasi, surplus, auth, profil).
// Semua pesan galat berbahasa Indonesia dan boleh langsung ditampilkan ke pengguna.
// Batas angka di sini sama dengan check constraint di supabase/migrations.

import { z } from "zod";
import { normalisasiNoHp } from "./pesanan";

const Id = z.guid("ID tidak valid.");

/** POST /api/orders */
export const SkemaBuatPesanan = z.object({
  listing_id: Id,
  jumlah_kg: z
    .number("Jumlah pesanan harus berupa angka.")
    .positive("Jumlah pesanan harus lebih dari 0 kg.")
    .max(100_000, "Jumlah pesanan paling banyak 100.000 kg."),
  kebutuhan_id: Id.nullish(),
});

/** Status yang bisa diminta klien. "menunggu" hanya dibuat oleh POST /api/orders. */
export const STATUS_TUJUAN = [
  "dikonfirmasi",
  "dikirim",
  "selesai",
  "ditolak",
  "dibatalkan",
  "gagal_panen",
] as const;

/** PATCH /api/orders/[id] */
export const SkemaUbahStatus = z
  .object({
    status: z.enum(STATUS_TUJUAN, "Status pesanan tidak dikenal."),
    alasan: z
      .string("Alasan harus berupa teks.")
      .trim()
      .max(300, "Alasan paling panjang 300 karakter.")
      .nullish(),
  })
  .superRefine((nilai, ctx) => {
    if (nilai.status === "gagal_panen" && (nilai.alasan ?? "").length < 3) {
      ctx.addIssue({
        code: "custom",
        path: ["alasan"],
        message: "Tulis alasan gagal panen supaya pembeli tahu penyebabnya.",
      });
    }
  });

/** POST /api/listings/[id]/surplus */
export const SkemaSurplus = z.object({
  harga_surplus: z
    .number("Harga surplus harus berupa angka.")
    .int("Harga surplus harus bilangan bulat (rupiah).")
    .min(100, "Harga surplus paling rendah Rp100/kg.")
    .max(1_000_000, "Harga surplus paling tinggi Rp1.000.000/kg."),
});

/** PATCH /api/notifikasi. Tanpa `ids` = tandai semua sudah dibaca. */
export const SkemaTandaiNotifikasi = z.object({
  ids: z
    .array(Id, "ids harus berupa daftar ID.")
    .min(1, "ids tidak boleh kosong.")
    .max(200, "Paling banyak 200 notifikasi sekali kirim.")
    .optional(),
});

const Email = z
  .string("Email wajib diisi.")
  .trim()
  .toLowerCase()
  .pipe(z.email("Format email tidak valid.").max(254, "Email terlalu panjang."));

const Nama = z
  .string("Nama wajib diisi.")
  .trim()
  .min(2, "Nama paling sedikit 2 huruf.")
  .max(80, "Nama paling panjang 80 karakter.");

const NamaUsaha = z
  .string("Nama usaha harus berupa teks.")
  .trim()
  .max(120, "Nama usaha paling panjang 120 karakter.")
  .transform((v) => (v === "" ? null : v))
  .nullish();

const KecamatanId = z
  .number("Pilih kecamatan.")
  .int("Kecamatan tidak dikenal.")
  .positive("Kecamatan tidak dikenal.");

const NoHp = z.string("Nomor HP wajib diisi.").transform((v, ctx) => {
  const nomor = normalisasiNoHp(v);
  if (!nomor) {
    ctx.addIssue({
      code: "custom",
      message: "Nomor HP tidak valid. Contoh: 081234567890.",
    });
    return z.NEVER;
  }
  return nomor;
});

/** POST /api/auth/masuk */
export const SkemaMasuk = z.object({
  email: Email,
  password: z
    .string("Kata sandi wajib diisi.")
    .min(1, "Kata sandi wajib diisi.")
    .max(72, "Kata sandi paling panjang 72 karakter."),
  /** Path tujuan setelah login (dari ?lanjut= di halaman Masuk). Disaring di server. */
  lanjut: z.string("lanjut harus berupa teks.").max(300, "lanjut terlalu panjang.").nullish(),
});

/** POST /api/auth/daftar */
export const SkemaDaftar = z.object({
  email: Email,
  password: z
    .string("Kata sandi wajib diisi.")
    .min(8, "Kata sandi paling sedikit 8 karakter.")
    .max(72, "Kata sandi paling panjang 72 karakter."),
  peran: z.enum(["penjual", "pembeli"], "Pilih peran: penjual atau pembeli."),
  nama: Nama,
  nama_usaha: NamaUsaha,
  kecamatan_id: KecamatanId,
  no_hp: NoHp,
});

/** PATCH /api/profil. Peran tidak bisa diganti. */
export const SkemaUbahProfil = z
  .object({
    nama: Nama.optional(),
    nama_usaha: NamaUsaha,
    kecamatan_id: KecamatanId.optional(),
    no_hp: NoHp.optional(),
  })
  .refine((nilai) => Object.values(nilai).some((v) => v !== undefined), {
    message: "Tidak ada data yang diubah.",
  });

/** Ambil satu kalimat galat yang bisa ditampilkan ke pengguna. */
export function pesanValidasi(error: z.ZodError): string {
  const pertama = error.issues[0];
  if (!pertama) return "Data yang dikirim tidak valid.";
  if (pertama.path.length === 0 && pertama.code === "invalid_type") {
    return "Body permintaan harus berupa objek JSON.";
  }
  return pertama.message;
}
