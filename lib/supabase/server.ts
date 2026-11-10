// Supabase client untuk kode server (route handler, server component).
//
// Client ini memakai anon key + cookie sesi pengguna, jadi semua query tetap
// tunduk pada Row Level Security. Buat client baru di setiap permintaan; jangan
// disimpan di variabel modul.

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export function supabaseTerkonfigurasi(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export async function buatSupabaseServer(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const kunci = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !kunci) {
    throw new Error("Supabase belum dikonfigurasi (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)");
  }
  const toko = await cookies();
  return createServerClient(url, kunci, {
    cookies: {
      getAll: () => toko.getAll(),
      setAll(daftar) {
        try {
          daftar.forEach(({ name, value, options }) => toko.set(name, value, options));
        } catch {
          // Dipanggil dari Server Component: cookie tidak bisa ditulis di sini,
          // sesi di-refresh oleh proxy.ts / route handler berikutnya.
        }
      },
    },
  });
}

export interface SesiServer {
  supabase: SupabaseClient;
  userId: string;
  email: string | null;
}

/**
 * Sesi pengguna yang sedang login, atau null. Token diverifikasi lewat
 * getClaims() (tanda tangan JWT dicek, bukan sekadar membaca cookie), jadi
 * userId aman dipakai untuk keputusan di server.
 */
export async function sesiOpsional(): Promise<SesiServer | null> {
  if (!supabaseTerkonfigurasi()) return null;
  try {
    const supabase = await buatSupabaseServer();
    const { data, error } = await supabase.auth.getClaims();
    const sub = data?.claims?.sub;
    if (error || typeof sub !== "string" || sub === "") return null;
    const email = typeof data?.claims?.email === "string" ? data.claims.email : null;
    return { supabase, userId: sub, email };
  } catch {
    return null;
  }
}

/** Id pengguna yang sedang login, atau null (juga null jika Supabase belum siap). */
export async function idPenggunaOpsional(): Promise<string | null> {
  return (await sesiOpsional())?.userId ?? null;
}
