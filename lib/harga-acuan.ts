// Harga acuan pasar untuk pembeli: pembanding harga petani di katalog.
// Logika murni (tanpa fs) agar bisa diuji; data disuntikkan oleh pemanggil.

import type { HargaAcuan } from "@/types";
import { rataMingguan } from "./forecast";
import { pilihSeri, type BarisHarga } from "./harga-csv";

const WILAYAH_PEMBELI = "Kota Bandung";
const bulatkanRatus = (x: number) => Math.round(x / 100) * 100;

/**
 * Rata-rata minggu terakhir harga pasar tradisional dan pedagang besar.
 * Null jika salah satu seri kosong (komoditas belum punya data harga).
 */
export function susunHargaAcuan(
  komoditasId: number,
  data: BarisHarga[],
  sumber: string,
): HargaAcuan | null {
  const pasar = pilihSeri(data, WILAYAH_PEMBELI, "pasar_tradisional");
  const grosir = pilihSeri(data, WILAYAH_PEMBELI, "pedagang_besar");
  const mPasar = rataMingguan(pasar).at(-1);
  const mGrosir = rataMingguan(grosir).at(-1);
  if (!mPasar || !mGrosir) return null;

  const dataSampai = pasar.reduce((m, t) => (t.tanggal > m ? t.tanggal : m), pasar[0].tanggal);
  return {
    komoditas_id: komoditasId,
    wilayah: WILAYAH_PEMBELI,
    pasar_per_kg: bulatkanRatus(mPasar.harga),
    grosir_per_kg: bulatkanRatus(mGrosir.harga),
    minggu: mPasar.tanggal,
    data_sampai: dataSampai,
    sumber,
  };
}

export interface Perbandingan {
  /** Positif = harga katalog lebih murah dari acuan. Rupiah per kg. */
  selisih: number;
  /** Selisih dibanding acuan, 0,12 = 12%. */
  persen: number;
  arah: "lebih_murah" | "setara" | "lebih_mahal";
}

/** Bandingkan harga katalog dengan harga acuan. Beda di bawah 1% dianggap setara. */
export function bandingkanHarga(hargaKatalog: number, acuan: number): Perbandingan {
  const selisih = acuan - hargaKatalog;
  const persen = acuan > 0 ? selisih / acuan : 0;
  const arah = Math.abs(persen) < 0.01 ? "setara" : selisih > 0 ? "lebih_murah" : "lebih_mahal";
  return { selisih, persen, arah };
}
