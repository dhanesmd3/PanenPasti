// Proxy Next.js 16 (dulu bernama middleware.ts). Berjalan sebelum halaman dan
// route handler: menyegarkan sesi Supabase dan menjaga /penjual/* hanya untuk
// penjual, /pembeli/* hanya untuk pembeli. Logikanya ada di lib/supabase/proxy.ts.

import type { NextRequest } from "next/server";
import { perbaruiSesi } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return perbaruiSesi(request);
}

export const config = {
  matcher: [
    // Semua path kecuali aset statis. /api/* tetap lewat sini supaya sesi
    // disegarkan di satu tempat sebelum route handler membacanya.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|woff|woff2)$).*)",
  ],
};
