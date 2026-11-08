// Pembaca data/harga/cabai_rawit_merah_pihps.csv.
// Format: tanggal,wilayah,tingkat,harga_per_kg (lihat data/README.md).

import type { TingkatHarga } from "@/types";
import type { TitikHarga } from "./forecast";

export interface BarisHarga {
  tanggal: string;
  wilayah: string;
  tingkat: TingkatHarga;
  harga_per_kg: number;
}

const TINGKAT: ReadonlySet<string> = new Set<TingkatHarga>([
  "produsen",
  "pedagang_besar",
  "pasar_tradisional",
]);

export function bacaCsvHarga(teks: string): BarisHarga[] {
  const baris = teks.trim().split(/\r?\n/);
  const kepala = baris.shift();
  if (kepala !== "tanggal,wilayah,tingkat,harga_per_kg") {
    throw new Error(`Header CSV tidak dikenali: ${kepala}`);
  }
  return baris.map((b, i) => {
    const [tanggal, wilayah, tingkat, harga] = b.split(",");
    const harga_per_kg = Number(harga);
    if (!TINGKAT.has(tingkat) || !Number.isFinite(harga_per_kg) || harga_per_kg <= 0) {
      throw new Error(`Baris ${i + 2} tidak valid: ${b}`);
    }
    return { tanggal, wilayah, tingkat: tingkat as TingkatHarga, harga_per_kg };
  });
}

/** Ambil satu seri harga, mis. pedagang besar Kota Bandung. */
export function pilihSeri(
  data: BarisHarga[],
  wilayah: string,
  tingkat: TingkatHarga,
): TitikHarga[] {
  return data
    .filter((d) => d.wilayah === wilayah && d.tingkat === tingkat)
    .map((d) => ({ tanggal: d.tanggal, harga: d.harga_per_kg }));
}
