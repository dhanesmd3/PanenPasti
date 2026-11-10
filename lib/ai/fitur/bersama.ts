// Aturan dan validasi yang dipakai bersama oleh AI-1 dan AI-2.

export const KOMODITAS = { id: 1, nama: "Cabai Rawit Merah" } as const;

export const ATURAN_KOMODITAS = `- komoditas: "cabai_rawit_merah" untuk cabai rawit, cabe rawit, rawit, cengek, lombok rawit, atau "cabai"/"cabe" tanpa keterangan jenis. "lainnya" untuk komoditas lain (cabai merah keriting, cabai hijau, bawang, tomat, dll.).`;

export const ATURAN_SATUAN = `- jumlah_kg: ubah ke kilogram. 1 kuintal = 100 kg, 1 ton = 1000 kg, 1 ons = 0,1 kg, "sekilo"/"sekilogram" = 1 kg, "setengah kilo" = 0,5 kg.`;

/** Jumlah kg yang masuk akal untuk satu transaksi; selain itu dianggap tidak disebut. */
export function kgWajar(kg: number | null): number | null {
  if (kg == null || !Number.isFinite(kg) || kg <= 0 || kg > 100_000) return null;
  return Math.round(kg * 10) / 10;
}

/** Harga per kg cabai yang masuk akal (Rp5.000–Rp300.000). */
export function hargaWajar(harga: number | null): number | null {
  if (harga == null || !Number.isFinite(harga) || harga < 5_000 || harga > 300_000) return null;
  return Math.round(harga / 100) * 100;
}
