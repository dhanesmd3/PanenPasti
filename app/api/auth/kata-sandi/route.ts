import { z } from "zod";
import { bacaBody, galat, sesiWajib } from "@/lib/api";
import { cekBatasMasuk } from "@/lib/batas-auth";
import { dariGalatAuth } from "@/lib/galat-auth";

// POST /api/auth/kata-sandi   (halaman Pengaturan)
// Body:   { lama, baru }
// Sukses: { ok: true }
// Gagal:  400 body tidak valid / sandi baru sama · 401 belum login atau sandi lama salah
//         429 terlalu banyak percobaan
//
// Kata sandi lama diperiksa ulang lewat signInWithPassword, supaya orang yang
// sekadar memegang HP yang masih login tidak bisa mengganti sandi. Percobaan
// dihitung bersama batas login (10 per akun per 15 menit).

const Skema = z.object({
  lama: z.string("Kata sandi lama wajib diisi.").min(1, "Kata sandi lama wajib diisi.").max(72),
  baru: z
    .string("Kata sandi baru wajib diisi.")
    .min(8, "Kata sandi baru paling sedikit 8 karakter.")
    .max(72, "Kata sandi baru paling panjang 72 karakter."),
});

export async function POST(request: Request) {
  const sesi = await sesiWajib();
  if (!sesi.ok) return sesi.respons;
  const { supabase, email } = sesi.data;
  if (!email) return galat("Akun ini tidak memakai email, kata sandi tidak bisa diganti di sini.", 400);

  const body = await bacaBody(request, Skema);
  if (!body.ok) return body.respons;
  const { lama, baru } = body.data;
  if (lama === baru) return galat("Kata sandi baru harus berbeda dari yang lama.", 400);

  const dibatasi = cekBatasMasuk(request.headers, email);
  if (dibatasi) return dibatasi;

  const cek = await supabase.auth.signInWithPassword({ email, password: lama });
  if (cek.error) {
    if (cek.error.code === "invalid_credentials") return galat("Kata sandi lama salah.", 401);
    return dariGalatAuth(cek.error, "POST /api/auth/kata-sandi (cek)");
  }

  const { error } = await supabase.auth.updateUser({ password: baru });
  if (error) return dariGalatAuth(error, "POST /api/auth/kata-sandi");

  return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
