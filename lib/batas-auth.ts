// Rate limit untuk login dan pendaftaran (PRD bagian 12).
//
// Memakai pembatas di memori yang sama dengan endpoint AI (lib/rate-limit.ts),
// dengan keterbatasan yang sama: hitungannya per instance server. Ini lapisan
// pertama untuk menahan tebak-tebakan kata sandi; Supabase Auth punya rate
// limit sendiri di belakangnya.

import { galat } from "./api";
import { kunciPembatas, periksaBatas } from "./rate-limit";

const JENDELA_MS = 15 * 60 * 1000;

export const BATAS_MASUK_PER_AKUN = 10;
export const BATAS_MASUK_PER_IP = 60;
export const BATAS_DAFTAR_PER_IP = 10;

function terlaluBanyak(cobaLagiDetik: number): Response {
  const menit = Math.max(1, Math.ceil(cobaLagiDetik / 60));
  return galat(`Terlalu banyak percobaan. Coba lagi dalam ${menit} menit.`, 429, undefined, {
    "retry-after": String(cobaLagiDetik),
  });
}

/** Null jika boleh lanjut, Response 429 jika batas terlewati. */
export function cekBatasMasuk(headers: Headers, email: string): Response | null {
  const ip = kunciPembatas(headers);
  const perIp = periksaBatas(`masuk:${ip}`, BATAS_MASUK_PER_IP, JENDELA_MS);
  if (!perIp.boleh) return terlaluBanyak(perIp.cobaLagiDetik);
  const perAkun = periksaBatas(`masuk:${ip}:${email}`, BATAS_MASUK_PER_AKUN, JENDELA_MS);
  if (!perAkun.boleh) return terlaluBanyak(perAkun.cobaLagiDetik);
  return null;
}

export function cekBatasDaftar(headers: Headers): Response | null {
  const hasil = periksaBatas(`daftar:${kunciPembatas(headers)}`, BATAS_DAFTAR_PER_IP, JENDELA_MS);
  return hasil.boleh ? null : terlaluBanyak(hasil.cobaLagiDetik);
}
