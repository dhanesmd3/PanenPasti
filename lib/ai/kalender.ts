// Konteks tanggal untuk prompt. LLM sering salah menghitung tanggal,
// jadi kita beri daftar tanggal siap pakai dan LLM cukup memilih.

import { keNomorHari, namaHari, tambahHari, tanggalPanjang } from "../tanggal";

export function konteksKalender(hariIni: string, jumlahHari = 35): string {
  const [y, m] = hariIni.split("-").map(Number);
  const akhirBulan = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  const akhirBulanDepan = new Date(Date.UTC(y, m + 1, 0)).toISOString().slice(0, 10);

  const daftar = Array.from({ length: jumlahHari }, (_, i) => {
    const t = tambahHari(hariIni, i);
    const label = i === 0 ? " (hari ini)" : i === 1 ? " (besok)" : i === 2 ? " (lusa)" : "";
    return `${t} ${namaHari(t)}${label}`;
  }).join("\n");

  return [
    `Hari ini: ${tanggalPanjang(hariIni)} (${hariIni}).`,
    `Akhir bulan ini: ${akhirBulan}. Akhir bulan depan: ${akhirBulanDepan}.`,
    `"Minggu depan" tanpa hari = Senin minggu depan.`,
    `Nama hari tanpa keterangan ("Senin", "tiap Senin") = hari tersebut yang paling dekat setelah hari ini.`,
    `Kalender:`,
    daftar,
  ].join("\n");
}

/** Pastikan tanggal valid dan berada dalam rentang [hariIni, hariIni + maksHari]. */
export function tanggalWajar(tanggal: string, hariIni: string, maksHari = 120): boolean {
  try {
    const selisih = keNomorHari(tanggal) - keNomorHari(hariIni);
    return selisih >= 0 && selisih <= maksHari;
  } catch {
    return false;
  }
}
