// Respons standar untuk route AI: sukses dan gagal (dengan fallback form manual).

import type { GagalAI } from "@/types";
import { batasAIPerJam, kunciPembatas, periksaBatas } from "../rate-limit";
import { GalatAI } from "./provider";

export const LABEL_AI = "Dibuat oleh AI — periksa sebelum disimpan";

export function gagal(pesan: string, status: number, pakaiFormManual = true): Response {
  const isi: GagalAI = { ok: false, pesan, pakai_form_manual: pakaiFormManual };
  return Response.json(isi, { status });
}

/** Ubah GalatAI menjadi respons yang ramah pengguna. Galat lain dilempar ulang. */
export function responsGalatAI(e: unknown): Response {
  if (!(e instanceof GalatAI)) throw e;
  console.error(`[AI] ${e.jenis}: ${e.message}`);
  switch (e.jenis) {
    case "kuota":
      return gagal("Asisten AI sedang sibuk. Silakan isi form secara manual.", 429);
    case "konfigurasi":
      return gagal("Asisten AI belum aktif. Silakan isi form secara manual.", 503);
    case "output":
      return gagal("AI belum bisa memahami kalimat ini. Silakan isi form secara manual.", 422);
    default:
      return gagal("Asisten AI sedang tidak tersedia. Silakan isi form secara manual.", 503);
  }
}

/** Cek rate limit; kembalikan Response jika melebihi batas, null jika boleh lanjut. */
export function cekBatasAI(headers: Headers, userId?: string | null): Response | null {
  const hasil = periksaBatas(kunciPembatas(headers, userId), batasAIPerJam());
  if (hasil.boleh) return null;
  const menit = Math.ceil(hasil.cobaLagiDetik / 60);
  return new Response(
    JSON.stringify({
      ok: false,
      pesan: `Batas pemakaian asisten AI tercapai. Coba lagi dalam ${menit} menit, atau isi form secara manual.`,
      pakai_form_manual: true,
    } satisfies GagalAI),
    {
      status: 429,
      headers: { "content-type": "application/json", "retry-after": String(hasil.cobaLagiDetik) },
    },
  );
}

/** Baca body JSON dengan aman. */
export async function bacaJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
