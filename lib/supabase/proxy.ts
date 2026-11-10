// Dipanggil dari proxy.ts di root (pengganti middleware.ts di Next.js 16).
//
// Dua tugas:
//   1. Menyegarkan sesi Supabase. Token yang hampir kedaluwarsa diperbarui di
//      sini dan cookie barunya dipasang di permintaan (untuk kode server di
//      belakangnya) sekaligus di respons (untuk browser).
//   2. Mengarahkan pengguna sesuai peran (aturannya di ./akses.ts).

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { adalahPeran, jenisRute, perluPeran, tujuanAlih } from "./akses";
import type { Peran } from "@/types";

export async function perbaruiSesi(request: NextRequest): Promise<NextResponse> {
  let respons = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const kunci = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Tanpa konfigurasi Supabase aplikasi tetap bisa dibuka (halaman publik, API harga).
  if (!url || !kunci) return respons;

  const supabase = createServerClient(url, kunci, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(daftar, headers) {
        daftar.forEach(({ name, value }) => request.cookies.set(name, value));
        respons = NextResponse.next({ request });
        daftar.forEach(({ name, value, options }) => respons.cookies.set(name, value, options));
        // Respons yang membawa cookie sesi tidak boleh disimpan CDN.
        Object.entries(headers ?? {}).forEach(([nama, nilai]) => respons.headers.set(nama, nilai));
      },
    },
  });

  // Jangan menaruh kode lain di antara pembuatan client dan getClaims():
  // di sinilah token disegarkan.
  let userId: string | null = null;
  try {
    const { data } = await supabase.auth.getClaims();
    const sub = data?.claims?.sub;
    userId = typeof sub === "string" && sub !== "" ? sub : null;
  } catch {
    userId = null;
  }

  const { pathname, search } = request.nextUrl;
  const jenis = jenisRute(pathname);

  let peran: Peran | null = null;
  if (userId && perluPeran(jenis)) {
    const { data: profil } = await supabase
      .from("profiles")
      .select("peran")
      .eq("id", userId)
      .maybeSingle();
    peran = adalahPeran(profil?.peran) ? profil.peran : null;
  }

  const tujuan = tujuanAlih({ pathname, search, login: userId !== null, peran });
  if (!tujuan) return respons;

  const alih = NextResponse.redirect(new URL(tujuan, request.url));
  // Cookie sesi yang baru disegarkan harus ikut di respons redirect.
  respons.cookies.getAll().forEach((cookie) => alih.cookies.set(cookie));
  for (const nama of ["cache-control", "expires", "pragma"]) {
    const nilai = respons.headers.get(nama);
    if (nilai) alih.headers.set(nama, nilai);
  }
  return alih;
}
