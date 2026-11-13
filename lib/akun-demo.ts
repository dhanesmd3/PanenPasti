// Akun demo untuk juri dan tim: satu penjual, satu pembeli.
// Dibuat oleh `npm run akun:demo` (atau `npm run seed`). Email di sini harus
// sama dengan EMAIL_DEMO di scripts/akun.mjs.

import type { Peran } from "@/types";

export const EMAIL_DEMO: Record<Peran, string> = {
  penjual: "penjual.demo@example.com",
  pembeli: "pembeli.demo@example.com",
};

/**
 * Tombol "Coba akun demo" hanya aktif kalau DEMO_PASSWORD diisi di server.
 * Kata sandinya tidak pernah dikirim ke browser.
 */
export function passwordDemo(): string | null {
  return process.env.DEMO_PASSWORD || null;
}
