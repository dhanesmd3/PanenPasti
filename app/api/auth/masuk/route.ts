import { bacaBody, galat } from "@/lib/api";
import { cekBatasMasuk } from "@/lib/batas-auth";
import { dariGalatAuth } from "@/lib/galat-auth";
import { SkemaMasuk } from "@/lib/skema-api";
import { adalahPeran, lanjutAman } from "@/lib/supabase/akses";
import { buatSupabaseServer, supabaseTerkonfigurasi } from "@/lib/supabase/server";

// POST /api/auth/masuk   Pemilik: A
// Body:   { email, password, lanjut? }
// Sukses: { ok: true, peran: "penjual" | "pembeli" | null, lanjut: "/penjual" }
//         Cookie sesi dipasang di respons; arahkan pengguna ke `lanjut`.
// Gagal:  401 email/kata sandi salah · 403 email belum dikonfirmasi ·
//         429 terlalu banyak percobaan · 400 body tidak valid
//
// Login lewat server (bukan langsung dari browser ke Supabase) supaya percobaan
// bisa dibatasi: 10 kali per akun dan 60 kali per IP dalam 15 menit.
export async function POST(request: Request) {
  if (!supabaseTerkonfigurasi()) return galat("Database belum dikonfigurasi.", 503);

  const body = await bacaBody(request, SkemaMasuk);
  if (!body.ok) return body.respons;
  const { email, password, lanjut } = body.data;

  const dibatasi = cekBatasMasuk(request.headers, email);
  if (dibatasi) return dibatasi;

  const supabase = await buatSupabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return dariGalatAuth(error, "POST /api/auth/masuk");
  if (!data.user) return galat("Email atau kata sandi salah.", 401);

  const { data: profil } = await supabase
    .from("profiles")
    .select("peran")
    .eq("id", data.user.id)
    .maybeSingle();
  const peran = adalahPeran(profil?.peran) ? profil.peran : null;

  return Response.json(
    { ok: true, peran, lanjut: peran ? lanjutAman(lanjut, peran) : "/" },
    { headers: { "cache-control": "no-store" } },
  );
}
