// Supabase client untuk kode server (route handler, server component).
// Dibuat oleh D untuk /api/match; A bebas menyesuaikan (folder milik A).

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function supabaseTerkonfigurasi(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export async function buatSupabaseServer() {
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

/** Id pengguna yang sedang login, atau null (juga null jika Supabase belum siap). */
export async function idPenggunaOpsional(): Promise<string | null> {
  if (!supabaseTerkonfigurasi()) return null;
  try {
    const supabase = await buatSupabaseServer();
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}
