// Aturan dan validasi yang dipakai bersama oleh AI-1 dan AI-2.

import { DAFTAR_KOMODITAS, KODE_KOMODITAS, komoditasDariId, komoditasDariKode } from "../../komoditas";

/** Enum keluaran AI: semua kode komoditas + "lainnya". */
export const PILIHAN_KOMODITAS = [...KODE_KOMODITAS, "lainnya"] as const;

export const ATURAN_KOMODITAS = [
  "- komoditas: pilih satu kode berikut.",
  ...DAFTAR_KOMODITAS.map((k) => `  - "${k.kode}" untuk ${k.sebutan}.`),
  '  - "lainnya" untuk komoditas lain yang tidak ada di daftar (cabai hijau, bawang putih, buah, beras, dll.).',
].join("\n");

export const ATURAN_SATUAN = `- jumlah_kg: ubah ke kilogram. 1 kuintal = 100 kg, 1 ton = 1000 kg, 1 ons = 0,1 kg, "sekilo"/"sekilogram" = 1 kg, "setengah kilo" = 0,5 kg.`;

/** Kode AI → { id, nama } komoditas, atau null untuk "lainnya"/kode tak dikenal. */
export function petakanKomoditas(kode: string): { id: number; nama: string } | null {
  const k = komoditasDariKode(kode);
  return k ? { id: k.id, nama: k.nama } : null;
}

/** Jumlah kg yang masuk akal untuk satu transaksi; selain itu dianggap tidak disebut. */
export function kgWajar(kg: number | null): number | null {
  if (kg == null || !Number.isFinite(kg) || kg <= 0 || kg > 100_000) return null;
  return Math.round(kg * 10) / 10;
}

/** Harga per kg yang masuk akal untuk komoditas itu (default: rentang cabai rawit). */
export function hargaWajar(harga: number | null, komoditasId = 1): number | null {
  const [min, maks] = komoditasDariId(komoditasId)?.harga ?? [5_000, 300_000];
  if (harga == null || !Number.isFinite(harga) || harga < min || harga > maks) return null;
  return Math.round(harga / 100) * 100;
}
