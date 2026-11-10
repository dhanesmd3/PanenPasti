import { idPenggunaOpsional } from "@/lib/supabase/server";
import { z } from "zod";
import { DISCLAIMER, jelaskanHarga } from "@/lib/ai/fitur/penjelasan-harga";
import { bacaJson, cekBatasAI, gagal, LABEL_AI } from "@/lib/ai/respons";
import { dataHarga, SUMBER_HARGA } from "@/lib/data/statis";
import { KOMODITAS_DIDUKUNG, susunPrediksi } from "@/lib/harga-prediksi";
import { keNomorHari } from "@/lib/tanggal";

// POST /api/ai/penjelasan-harga  (AI-3)  Pemilik: D
// Body:   { "komoditas_id": 1, "tgl_panen": "2026-11-28" }   (tgl_panen opsional)
// Sukses: { ok: true, teks, dibuat_ai, label, disclaimer, saran, minggu_panen }
// Jika AI gagal atau kuota habis, teks diganti template dari angka yang sama
// (dibuat_ai = false), jadi endpoint ini selalu memberi jawaban.

const Masukan = z.object({
  komoditas_id: z.number().int().default(KOMODITAS_DIDUKUNG),
  tgl_panen: z
    .string()
    .refine((t) => {
      try {
        keNomorHari(t);
        return true;
      } catch {
        return false;
      }
    }, "Format YYYY-MM-DD")
    .nullish(),
});

// Teks yang sama dipakai ulang selama data dan minggu panennya sama (hemat kuota AI).
const cache = new Map<string, { teks: string; dibuat_ai: boolean; kedaluwarsa: number }>();
const UMUR_CACHE_MS = 6 * 60 * 60 * 1000;

export async function POST(request: Request) {
  const masukan = Masukan.safeParse((await bacaJson(request)) ?? {});
  if (!masukan.success) return gagal("Data permintaan tidak valid.", 400, false);
  if (masukan.data.komoditas_id !== KOMODITAS_DIDUKUNG) {
    return gagal("Komoditas belum didukung.", 404, false);
  }

  const prediksi = susunPrediksi(dataHarga(), SUMBER_HARGA, masukan.data.tgl_panen);
  const kunci = `${prediksi.data_sampai}|${prediksi.minggu_panen}`;
  const tersimpan = cache.get(kunci);

  let hasil: { teks: string; dibuat_ai: boolean };
  if (tersimpan && tersimpan.kedaluwarsa > Date.now()) {
    hasil = tersimpan;
  } else {
    const dibatasi = cekBatasAI(request.headers, await idPenggunaOpsional());
    if (dibatasi) return dibatasi;
    hasil = await jelaskanHarga(prediksi);
    if (hasil.dibuat_ai) cache.set(kunci, { ...hasil, kedaluwarsa: Date.now() + UMUR_CACHE_MS });
  }

  return Response.json({
    ok: true,
    teks: hasil.teks,
    dibuat_ai: hasil.dibuat_ai,
    label: hasil.dibuat_ai ? LABEL_AI : null,
    disclaimer: DISCLAIMER,
    saran: prediksi.saran,
    minggu_panen: prediksi.minggu_panen,
  });
}
