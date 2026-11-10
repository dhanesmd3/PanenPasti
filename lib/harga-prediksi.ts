// Menyusun respons GET /api/harga/prediksi dari data harga.
// Logika murni (tanpa fs) agar bisa diuji; data disuntikkan oleh pemanggil.

import type { HargaMingguan, Prediksi, TitikPrediksi } from "@/types";
import {
  prediksiHarga,
  rasioHarga,
  rataMingguan,
  saranJual,
  skalakan,
  type TitikHarga,
} from "./forecast";
import { pilihSeri, type BarisHarga } from "./harga-csv";
import { awalMinggu, keNomorHari } from "./tanggal";

export const KOMODITAS_DIDUKUNG = 1; // Cabai Rawit Merah
const MINGGU_HISTORIS = 26;

/**
 * Pilih titik prediksi untuk minggu panen.
 * Sebelum rentang prediksi → minggu pertama; sesudahnya → minggu terakhir.
 */
export function pilihMingguPanen(
  prediksi: TitikPrediksi[],
  tglPanen?: string | null,
): TitikPrediksi {
  if (!tglPanen) return prediksi[0];
  const target = keNomorHari(awalMinggu(tglPanen));
  const cocok = prediksi.find((p) => keNomorHari(p.tanggal) === target);
  if (cocok) return cocok;
  return target < keNomorHari(prediksi[0].tanggal)
    ? prediksi[0]
    : prediksi[prediksi.length - 1];
}

function petaMingguan(seri: TitikHarga[]): Map<string, number> {
  return new Map(rataMingguan(seri).map((t) => [t.tanggal, Math.round(t.harga)]));
}

export function susunPrediksi(
  data: BarisHarga[],
  sumber: string,
  tglPanen?: string | null,
): Prediksi {
  const grosir = pilihSeri(data, "Kota Bandung", "pedagang_besar");
  const pasar = pilihSeri(data, "Kota Bandung", "pasar_tradisional");
  const petani = pilihSeri(data, "Kab. Garut", "produsen");

  const prediksiGrosir = prediksiHarga(grosir);
  const rasio = rasioHarga(petani, grosir);
  const prediksiPetani = skalakan(prediksiGrosir, rasio);

  const mGrosir = petaMingguan(grosir);
  const mPasar = petaMingguan(pasar);
  const mPetani = petaMingguan(petani);
  const mingguGrosir = [...mGrosir.keys()];
  const historis: HargaMingguan[] = mingguGrosir.slice(-MINGGU_HISTORIS).map((tanggal) => ({
    tanggal,
    grosir_bandung: mGrosir.get(tanggal) ?? null,
    pasar_bandung: mPasar.get(tanggal) ?? null,
    petani_garut: mPetani.get(tanggal) ?? null,
  }));

  const mingguAkhir = mingguGrosir[mingguGrosir.length - 1];
  const grosirTerakhir = mGrosir.get(mingguAkhir)!;
  const pasarTerakhir = [...mPasar.values()].at(-1)!;
  const petaniSekarang = Math.round((grosirTerakhir * rasio) / 100) * 100;

  const panen = pilihMingguPanen(prediksiPetani, tglPanen);
  const dataSampai = grosir.reduce((m, t) => (t.tanggal > m ? t.tanggal : m), grosir[0].tanggal);

  return {
    komoditas_id: KOMODITAS_DIDUKUNG,
    sumber_data: sumber,
    data_sampai: dataSampai,
    simulasi: false,
    harga_terakhir: {
      grosir_bandung: grosirTerakhir,
      pasar_bandung: pasarTerakhir,
      petani_perkiraan: petaniSekarang,
    },
    rasio_petani: Math.round(rasio * 1000) / 1000,
    historis,
    prediksi_grosir: prediksiGrosir,
    prediksi_petani: prediksiPetani,
    minggu_panen: panen.tanggal,
    saran: saranJual(petaniSekarang, panen.nilai),
    perubahan: Math.round(((panen.nilai - petaniSekarang) / petaniSekarang) * 1000) / 1000,
  };
}
