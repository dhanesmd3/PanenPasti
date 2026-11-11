// Perkakas tampilan notifikasi (dipakai app/notifikasi). Fungsi murni supaya bisa diuji.

import type { Notifikasi, Peran } from "@/types";
import { hariIniWib, selisihHari, tanggalPendek } from "./tanggal";

/** "baru saja", "5 menit lalu", "3 jam lalu", "kemarin", lalu "10 Nov". */
export function waktuLalu(iso: string, sekarang: Date = new Date()): string {
  const detik = Math.max(0, (sekarang.getTime() - new Date(iso).getTime()) / 1000);
  if (detik < 60) return "baru saja";
  if (detik < 3600) return `${Math.floor(detik / 60)} menit lalu`;
  const tgl = hariIniWib(new Date(iso));
  const hari = selisihHari(hariIniWib(sekarang), tgl);
  if (hari === 0) return `${Math.floor(detik / 3600)} jam lalu`;
  if (hari === 1) return "kemarin";
  return tanggalPendek(tgl);
}

/** Halaman yang dibuka saat notifikasi diketuk, atau null kalau tidak ada tujuan. */
export function tujuanNotifikasi(n: Pick<Notifikasi, "tipe" | "order_id" | "listing_id">, peran: Peran | null): string | null {
  if (n.tipe === "surplus" && n.listing_id && peran === "pembeli") return `/pembeli/katalog/${n.listing_id}`;
  if (n.order_id && peran) return `/${peran}/pesanan`;
  return null;
}
