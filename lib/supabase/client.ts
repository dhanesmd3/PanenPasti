// Supabase client untuk komponen di browser ("use client").
//
// Memakai anon key, jadi semua query tunduk pada Row Level Security. Sesi
// disimpan di cookie yang sama dengan yang dibaca server (lib/supabase/server.ts)
// dan proxy.ts, sehingga login di satu sisi langsung dikenali sisi lain.
//
// Contoh:
//   const supabase = buatSupabaseBrowser();
//   const { data, error } = await supabase.from("listings").select("*");
//
// Catatan untuk tabel profiles: kolom no_hp tidak bisa di-select, jadi jangan
// memakai select("*"). Sebut kolomnya, atau pakai GET /api/profil.

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

export function buatSupabaseBrowser(): SupabaseClient {
  // Harus ditulis langsung seperti ini: Next.js menanam nilai NEXT_PUBLIC_* ke
  // bundel browser hanya jika namanya muncul utuh di kode.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const kunci = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !kunci) {
    throw new Error(
      "Supabase belum dikonfigurasi. Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY di .env.local.",
    );
  }
  // createBrowserClient mengembalikan satu instance yang sama di browser.
  return createBrowserClient(url, kunci);
}
