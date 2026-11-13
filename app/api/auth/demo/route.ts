import { bacaBody, galat } from "@/lib/api";
import { EMAIL_DEMO, passwordDemo } from "@/lib/akun-demo";
import { cekBatasMasuk } from "@/lib/batas-auth";
import { dariGalatAuth } from "@/lib/galat-auth";
import { SkemaMasukDemo } from "@/lib/skema-api";
import { lanjutAman } from "@/lib/supabase/akses";
import { buatSupabaseServer, supabaseTerkonfigurasi } from "@/lib/supabase/server";

// POST /api/auth/demo
// Body:   { peran: "penjual" | "pembeli", lanjut? }
// Sukses: { ok: true, peran, lanjut }   (cookie sesi dipasang, sama seperti /api/auth/masuk)
// Gagal:  404 login demo tidak aktif · 503 akun demo belum dibuat / kata sandi beda ·
//         429 terlalu banyak percobaan · 400 body tidak valid
//
// Masuk ke akun demo tanpa mengetik kata sandi. Aktif hanya jika DEMO_PASSWORD
// diisi di server; akunnya dibuat dengan `npm run akun:demo`.
export async function POST(request: Request) {
  if (!supabaseTerkonfigurasi()) return galat("Database belum dikonfigurasi.", 503);
  const password = passwordDemo();
  if (!password) return galat("Login akun demo tidak aktif.", 404);

  const body = await bacaBody(request, SkemaMasukDemo);
  if (!body.ok) return body.respons;
  const { peran, lanjut } = body.data;
  const email = EMAIL_DEMO[peran];

  const dibatasi = cekBatasMasuk(request.headers, email);
  if (dibatasi) return dibatasi;

  const supabase = await buatSupabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error?.code === "invalid_credentials") {
    console.error("[POST /api/auth/demo] akun demo belum dibuat atau DEMO_PASSWORD beda. Jalankan npm run akun:demo");
    return galat("Akun demo belum disiapkan. Hubungi tim PanenPasti.", 503);
  }
  if (error) return dariGalatAuth(error, "POST /api/auth/demo");
  if (!data.user) return galat("Akun demo belum disiapkan. Hubungi tim PanenPasti.", 503);

  const { data: profil } = await supabase
    .from("profiles")
    .select("peran")
    .eq("id", data.user.id)
    .maybeSingle();
  if (profil?.peran !== peran) {
    await supabase.auth.signOut();
    console.error(`[POST /api/auth/demo] profil ${email} bukan ${peran}. Jalankan npm run akun:demo`);
    return galat("Akun demo belum disiapkan. Hubungi tim PanenPasti.", 503);
  }

  return Response.json(
    { ok: true, peran, lanjut: lanjutAman(lanjut, peran) },
    { headers: { "cache-control": "no-store" } },
  );
}
