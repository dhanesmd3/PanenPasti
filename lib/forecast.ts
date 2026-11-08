// Prediksi harga cabai beberapa minggu ke depan.
// Metode (docs/PRD bagian 9.2), dipilih lewat uji mundur pada data PIHPS 2 tahun:
//
//   1. Harga harian → rata-rata mingguan (Senin sebagai awal minggu).
//   2. "Balik ke rata-rata": harga yang jauh dari rata-rata 52 minggu cenderung
//      kembali pelan-pelan.  prediksi(h) = μ + (harga_terakhir − μ) × laju^h
//   3. Rentang 80% diambil dari kesalahan metode yang sama di masa lalu
//      (kuantil 10% dan 90% dari rasio aktual ÷ prediksi), jadi rentangnya
//      terkalibrasi, bukan tebakan.
//
// Tren garis lurus dan faktor musiman sudah diuji dan justru memperburuk hasil
// (lihat lib/forecast.test.ts, bagian evaluasi mundur).

import type { SaranJual, TitikPrediksi } from "@/types";
import { awalMinggu, keNomorHari, tambahHari } from "./tanggal";

export interface TitikHarga {
  /** "YYYY-MM-DD" */
  tanggal: string;
  /** Rupiah per kg */
  harga: number;
}

export interface OpsiPrediksi {
  /** Jumlah minggu yang diprediksi. Default 4. */
  mingguKeDepan?: number;
  /** Jumlah minggu untuk rata-rata acuan μ. Default 52. */
  jendelaRata?: number;
  /** Seberapa lambat harga kembali ke μ (0–1). 1 = tidak kembali. Default 0,9. */
  laju?: number;
  /** Cakupan rentang. Default 0,8 (80%). */
  cakupan?: number;
}

/** Minimal data mingguan sebelum prediksi boleh dibuat. */
export const MIN_MINGGU_DATA = 26;
/** Minimal sampel kesalahan untuk rentang empiris; di bawahnya pakai cadangan. */
const MIN_SAMPEL_RENTANG = 12;
/** Rentang cadangan per √minggu jika sampel kurang. */
const RENTANG_CADANGAN = 0.15;

const bulatkanRatus = (x: number) => Math.round(x / 100) * 100;
const rata = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

function kuantil(urut: number[], q: number): number {
  const pos = (urut.length - 1) * q;
  const bawah = Math.floor(pos);
  const atas = Math.ceil(pos);
  return urut[bawah] + (urut[atas] - urut[bawah]) * (pos - bawah);
}

/** Rata-rata harga per minggu, diurutkan dari yang terlama. */
export function rataMingguan(data: TitikHarga[]): TitikHarga[] {
  const kelompok = new Map<string, number[]>();
  for (const { tanggal, harga } of data) {
    const minggu = awalMinggu(tanggal);
    const isi = kelompok.get(minggu);
    if (isi) isi.push(harga);
    else kelompok.set(minggu, [harga]);
  }
  return [...kelompok.entries()]
    .sort(([a], [b]) => keNomorHari(a) - keNomorHari(b))
    .map(([tanggal, hargas]) => ({ tanggal, harga: rata(hargas) }));
}

/** Prediksi titik h minggu ke depan dari deret harga mingguan `ys`. */
function titikBalikKeRata(ys: number[], h: number, jendela: number, laju: number) {
  const terakhir = ys[ys.length - 1];
  const mu = rata(ys.slice(-jendela));
  return mu + (terakhir - mu) * laju ** h;
}

/**
 * Prediksi harga mingguan ke depan beserta rentangnya.
 * `tanggal` di hasil adalah hari Senin minggu yang diprediksi.
 */
export function prediksiHarga(
  data: TitikHarga[],
  opsi: OpsiPrediksi = {},
): TitikPrediksi[] {
  const { mingguKeDepan = 4, jendelaRata = 52, laju = 0.9, cakupan = 0.8 } = opsi;
  const mingguan = rataMingguan(data);
  if (mingguan.length < MIN_MINGGU_DATA) {
    throw new Error(
      `Data harga kurang: ${mingguan.length} minggu, butuh minimal ${MIN_MINGGU_DATA}`,
    );
  }
  const ys = mingguan.map((t) => t.harga);
  const mingguAkhir = mingguan[mingguan.length - 1].tanggal;
  const qBawah = (1 - cakupan) / 2;

  return Array.from({ length: mingguKeDepan }, (_, i) => {
    const h = i + 1;
    const nilai = titikBalikKeRata(ys, h, jendelaRata, laju);

    // Rasio aktual ÷ prediksi untuk horizon h di seluruh riwayat.
    const rasio: number[] = [];
    for (let t = MIN_MINGGU_DATA - 1; t + h < ys.length; t++) {
      const p = titikBalikKeRata(ys.slice(0, t + 1), h, jendelaRata, laju);
      if (p > 0) rasio.push(ys[t + h] / p);
    }

    let bawah: number;
    let atas: number;
    if (rasio.length >= MIN_SAMPEL_RENTANG) {
      rasio.sort((a, b) => a - b);
      bawah = nilai * kuantil(rasio, qBawah);
      atas = nilai * kuantil(rasio, 1 - qBawah);
    } else {
      const lebar = RENTANG_CADANGAN * Math.sqrt(h);
      bawah = nilai * (1 - lebar);
      atas = nilai * (1 + lebar);
    }

    return {
      tanggal: tambahHari(mingguAkhir, 7 * h),
      nilai: bulatkanRatus(nilai),
      bawah: bulatkanRatus(Math.max(0, Math.min(bawah, nilai))),
      atas: bulatkanRatus(Math.max(atas, nilai)),
    };
  });
}

/**
 * Rasio harga petani terhadap harga acuan (mis. produsen Garut ÷ grosir Bandung),
 * dari rata-rata `hari` terakhir.
 */
export function rasioHarga(
  pembilang: TitikHarga[],
  penyebut: TitikHarga[],
  hari = 90,
): number {
  const akhir = Math.max(
    ...penyebut.map((t) => keNomorHari(t.tanggal)),
    ...pembilang.map((t) => keNomorHari(t.tanggal)),
  );
  const dalamJendela = (t: TitikHarga) => keNomorHari(t.tanggal) > akhir - hari;
  const p = pembilang.filter(dalamJendela).map((t) => t.harga);
  const q = penyebut.filter(dalamJendela).map((t) => t.harga);
  if (p.length === 0 || q.length === 0) {
    throw new Error(`Tidak ada data dalam ${hari} hari terakhir untuk menghitung rasio`);
  }
  return rata(p) / rata(q);
}

/** Kalikan prediksi dengan rasio, mis. untuk perkiraan harga di tingkat petani. */
export function skalakan(
  prediksi: TitikPrediksi[],
  rasio: number,
): TitikPrediksi[] {
  return prediksi.map((t) => ({
    tanggal: t.tanggal,
    nilai: bulatkanRatus(t.nilai * rasio),
    bawah: bulatkanRatus(t.bawah * rasio),
    atas: bulatkanRatus(t.atas * rasio),
  }));
}

/**
 * "tahan" jika perkiraan di minggu panen lebih tinggi dari harga sekarang
 * lebih dari `ambang` (default 3%), selain itu "jual".
 */
export function saranJual(
  hargaSekarang: number,
  perkiraanMingguPanen: number,
  ambang = 0.03,
): SaranJual {
  return perkiraanMingguPanen > hargaSekarang * (1 + ambang) ? "tahan" : "jual";
}
