// AI-3: angka prediksi → 2–3 kalimat saran untuk petani (docs/PRD bagian 8).
// Angka dihitung kode (lib/forecast.ts). AI hanya merangkai kalimat, dan
// jawabannya ditolak jika memuat angka yang tidak ada di data (penjaga angka).

import { z } from "zod";
import type { Prediksi } from "@/types";
import { formatRupiah } from "../../format";
import { tanggalPendek, tambahHari } from "../../tanggal";
import { hasilkanJson } from "../hasilkan-json";
import { GalatAI, type ProviderAI } from "../provider";

export const DISCLAIMER =
  "Perkiraan, bukan jaminan. Dihitung dari data harga PIHPS Bank Indonesia.";

export interface FaktaHarga {
  hargaSekarang: string;
  mingguPanen: string;
  perkiraan: string;
  bawah: string;
  atas: string;
  persen: string;
  arah: "naik" | "turun" | "stabil";
  saran: Prediksi["saran"];
}

export function faktaDari(p: Prediksi): FaktaHarga {
  const titik = p.prediksi_petani.find((t) => t.tanggal === p.minggu_panen) ?? p.prediksi_petani[0];
  const persen = Math.round(Math.abs(p.perubahan) * 100);
  return {
    hargaSekarang: formatRupiah(p.harga_terakhir.petani_perkiraan),
    mingguPanen: `${tanggalPendek(titik.tanggal)}–${tanggalPendek(tambahHari(titik.tanggal, 6))}`,
    perkiraan: formatRupiah(titik.nilai),
    bawah: formatRupiah(titik.bawah),
    atas: formatRupiah(titik.atas),
    persen: `${persen}%`,
    arah: persen < 1 ? "stabil" : p.perubahan > 0 ? "naik" : "turun",
    saran: p.saran,
  };
}

/** Teks cadangan tanpa AI. Selalu benar karena langsung dari angka. */
export function teksTemplate(f: FaktaHarga): string {
  const arah =
    f.arah === "stabil"
      ? `relatif stabil dibanding sekarang (${f.hargaSekarang})`
      : `${f.arah} sekitar ${f.persen} dibanding sekarang (${f.hargaSekarang})`;
  const saran =
    f.saran === "tahan"
      ? "Jika memungkinkan, jangan buru-buru menjual di bawah harga sekarang."
      : "Menjual sesuai jadwal panen cukup aman; jangan lepas jauh di bawah harga perkiraan.";
  return `Perkiraan harga cabai rawit merah di tingkat petani pada minggu ${f.mingguPanen} sekitar ${f.perkiraan}/kg (kisaran ${f.bawah}–${f.atas}), ${arah}. ${saran}`;
}

/**
 * Penjaga angka: setiap "RpX" dan "X%" di teks harus ada di fakta,
 * dan tidak boleh ada penulisan harga lain ("60 ribu", "60rb").
 */
export function angkaSesuaiFakta(teks: string, f: FaktaHarga): boolean {
  const rpBoleh = new Set([f.hargaSekarang, f.perkiraan, f.bawah, f.atas]);
  const rp = teks.match(/Rp\s?[\d.]+/g) ?? [];
  if (rp.some((r) => !rpBoleh.has(r.replace(/\s/g, "").replace(/\.$/, "")))) return false;
  const persen = teks.match(/\d+(?:[.,]\d+)?\s?%/g) ?? [];
  if (persen.some((p) => p.replace(/\s/g, "") !== f.persen)) return false;
  if (/\d\s?(ribu|rb|k|juta|jt)\b/i.test(teks)) return false;
  return true;
}

const SkemaLLM = z.object({ teks: z.string() });

const SISTEM = `Kamu menulis saran harga jual singkat untuk ketua kelompok tani cabai di Garut.
Tulis 2–3 kalimat dalam bahasa Indonesia yang sederhana dan sopan (sapa "Bapak/Ibu").
Jangan memakai salam waktu seperti "selamat pagi/siang/malam".
Sebut harga sebagai "perkiraan harga di tingkat petani", karena angkanya adalah perkiraan.
Gunakan HANYA angka dari data yang diberikan, ditulis persis sama (contoh "Rp60.000", "5%").
Jangan menulis angka lain, jangan menjanjikan keuntungan, dan jangan menambahkan disclaimer.`;

export interface HasilPenjelasan {
  teks: string;
  dibuat_ai: boolean;
}

export async function jelaskanHarga(p: Prediksi, provider?: ProviderAI): Promise<HasilPenjelasan> {
  const f = faktaDari(p);
  const data = [
    `Harga di tingkat petani sekarang (perkiraan): ${f.hargaSekarang}/kg`,
    `Minggu panen: ${f.mingguPanen}`,
    `Perkiraan harga di minggu panen: ${f.perkiraan}/kg (kisaran ${f.bawah}–${f.atas})`,
    `Perubahan: ${f.arah === "stabil" ? "stabil" : `${f.arah} ${f.persen}`}`,
    `Saran sistem: ${f.saran === "tahan" ? "tahan dulu, jangan buru-buru menjual murah" : "jual sesuai jadwal panen"}`,
  ].join("\n");

  try {
    const { teks } = await hasilkanJson(SkemaLLM, { sistem: SISTEM, prompt: data }, provider);
    const bersih = teks.trim();
    if (bersih.length < 20 || bersih.length > 600 || !angkaSesuaiFakta(bersih, f)) {
      throw new GalatAI("output", "Teks AI memuat angka di luar data atau panjangnya tidak wajar");
    }
    return { teks: bersih, dibuat_ai: true };
  } catch (e) {
    if (!(e instanceof GalatAI)) throw e;
    console.error(`[AI-3] pakai template: ${e.jenis}: ${e.message}`);
    return { teks: teksTemplate(f), dibuat_ai: false };
  }
}
