// Ubah galat Supabase Auth menjadi respons berbahasa Indonesia.
// Daftar kode: https://supabase.com/docs/guides/auth/debugging/error-codes

import { galat } from "./api";

interface GalatAuth {
  code?: string | null;
  status?: number | null;
  message?: string | null;
}

const PETA: Record<string, { status: number; pesan: string }> = {
  invalid_credentials: { status: 401, pesan: "Email atau kata sandi salah." },
  email_not_confirmed: {
    status: 403,
    pesan: "Email belum dikonfirmasi. Buka tautan di email pendaftaran Anda.",
  },
  user_banned: { status: 403, pesan: "Akun ini dinonaktifkan." },
  user_already_exists: { status: 409, pesan: "Email sudah terdaftar. Silakan masuk." },
  email_exists: { status: 409, pesan: "Email sudah terdaftar. Silakan masuk." },
  weak_password: { status: 422, pesan: "Kata sandi terlalu lemah. Pakai minimal 8 karakter." },
  email_address_invalid: { status: 400, pesan: "Alamat email tidak bisa dipakai." },
  email_address_not_authorized: { status: 400, pesan: "Alamat email tidak bisa dipakai." },
  validation_failed: { status: 400, pesan: "Data pendaftaran tidak valid." },
  signup_disabled: { status: 403, pesan: "Pendaftaran sedang ditutup." },
  email_provider_disabled: { status: 403, pesan: "Pendaftaran dengan email sedang ditutup." },
  over_request_rate_limit: {
    status: 429,
    pesan: "Terlalu banyak percobaan. Coba lagi beberapa menit lagi.",
  },
  over_email_send_rate_limit: {
    status: 429,
    pesan: "Terlalu banyak email dikirim. Coba lagi beberapa menit lagi.",
  },
};

export function dariGalatAuth(e: GalatAuth, konteks: string): Response {
  const kode = e.code ?? "";
  const dikenal = PETA[kode];
  if (dikenal) return galat(dikenal.pesan, dikenal.status, kode);

  if (e.status === 429) {
    return galat("Terlalu banyak percobaan. Coba lagi beberapa menit lagi.", 429, kode || undefined);
  }

  console.error(`[${konteks}] ${kode || "tanpa kode"} (${e.status ?? "?"}): ${e.message ?? ""}`);
  return galat("Layanan akun sedang bermasalah. Coba lagi sebentar.", 502);
}
