import { bacaBody, galat } from "@/lib/api";
import { cekBatasDaftar } from "@/lib/batas-auth";
import { cariKecamatan } from "@/lib/data/statis";
import { dariGalatAuth } from "@/lib/galat-auth";
import { SkemaDaftar } from "@/lib/skema-api";
import { BERANDA } from "@/lib/supabase/akses";
import { buatSupabaseServer, supabaseTerkonfigurasi } from "@/lib/supabase/server";

// POST /api/auth/daftar   Pemilik: A
// Body:   { email, password, peran, nama, nama_usaha?, kecamatan_id, no_hp }
// Sukses: 201 { ok: true, peran, perlu_konfirmasi_email, lanjut }
//         perlu_konfirmasi_email = false → pengguna langsung login, arahkan ke `lanjut`.
//         perlu_konfirmasi_email = true  → minta pengguna membuka email dulu.
// Gagal:  409 email sudah terdaftar · 422 kata sandi lemah ·
//         429 terlalu banyak percobaan · 400 body tidak valid
//
// Data profil dikirim sebagai metadata pendaftaran. Trigger database
// buat_profil_pengguna_baru menyalinnya ke tabel profiles dalam transaksi yang
// sama dengan pembuatan akun, jadi tidak ada akun tanpa profil.
export async function POST(request: Request) {
  if (!supabaseTerkonfigurasi()) return galat("Database belum dikonfigurasi.", 503);

  const body = await bacaBody(request, SkemaDaftar);
  if (!body.ok) return body.respons;
  const { email, password, peran, nama, nama_usaha, kecamatan_id, no_hp } = body.data;

  if (!cariKecamatan(kecamatan_id)) return galat("Kecamatan tidak dikenal.", 400);

  const dibatasi = cekBatasDaftar(request.headers);
  if (dibatasi) return dibatasi;

  const supabase = await buatSupabaseServer();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { peran, nama, nama_usaha: nama_usaha ?? null, kecamatan_id, no_hp },
    },
  });
  if (error) return dariGalatAuth(error, "POST /api/auth/daftar");

  // Jika konfirmasi email aktif, Supabase menjawab "sukses" untuk email yang
  // sudah terdaftar tetapi mengembalikan pengguna tanpa identitas.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return galat("Email sudah terdaftar. Silakan masuk.", 409, "user_already_exists");
  }

  return Response.json(
    {
      ok: true,
      peran,
      perlu_konfirmasi_email: !data.session,
      lanjut: BERANDA[peran],
    },
    { status: 201, headers: { "cache-control": "no-store" } },
  );
}
