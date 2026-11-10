import { galat } from "@/lib/api";
import { buatSupabaseServer, supabaseTerkonfigurasi } from "@/lib/supabase/server";

// POST /api/auth/keluar   Pemilik: A
// Sukses: { ok: true }. Cookie sesi dihapus; arahkan pengguna ke "/".
// Aman dipanggil walau pengguna sudah keluar.
export async function POST() {
  if (!supabaseTerkonfigurasi()) return galat("Database belum dikonfigurasi.", 503);

  const supabase = await buatSupabaseServer();
  // scope "local": hanya sesi di perangkat ini yang diakhiri.
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) console.error(`[POST /api/auth/keluar] ${error.code ?? ""}: ${error.message}`);

  return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
