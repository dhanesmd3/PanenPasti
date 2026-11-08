// Matching kebutuhan pembeli dengan listing panen.
// Rumus: docs/PRD bagian 9.1
//   skor = 100 × (0,5·S_tanggal + 0,3·S_jumlah + 0,2·S_jarak)

import { selisihHari } from "./tanggal";
import type { HasilMatching, Listing } from "@/types";

export const BOBOT = { tanggal: 0.5, jumlah: 0.3, jarak: 0.2 } as const;
/** Listing dengan |tanggal panen − tanggal butuh| di atas ini tidak ditampilkan. */
export const MAKS_SELISIH_HARI = 7;
/** Jarak ≥ ini mendapat S_jarak = 0. Garut → Kota Bandung: 26–93 km. */
export const MAKS_JARAK_KM = 100;

export interface Koordinat {
  lat: number;
  lng: number;
}

export interface KebutuhanMatching {
  komoditas_id: number;
  jumlah_kg: number;
  /** "YYYY-MM-DD" */
  tgl_butuh: string;
  lokasi: Koordinat;
}

export interface KandidatMatching {
  listing: Listing;
  penjual: HasilMatching["penjual"];
  lokasi: Koordinat;
}

export interface OpsiMatching {
  /** Listing yang tidak boleh muncul, mis. listing yang baru gagal panen. */
  kecualikanListing?: string[];
  /** Jumlah hasil maksimum. Default: semua. */
  batas?: number;
}

/** Jarak garis lurus (haversine) dalam km. */
export function jarakKm(a: Koordinat, b: Koordinat): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Harga yang berlaku: harga surplus jika listing ditandai surplus. */
export function hargaBerlaku(listing: Listing): number {
  return listing.is_surplus && listing.harga_surplus != null
    ? listing.harga_surplus
    : listing.harga_per_kg;
}

export function skorTanggal(selisih: number): number {
  return Math.max(0, 1 - Math.abs(selisih) / MAKS_SELISIH_HARI);
}

export function skorJumlah(sisaKg: number, butuhKg: number): number {
  return Math.min(1, sisaKg / butuhKg);
}

export function skorJarak(km: number): number {
  return Math.max(0, 1 - km / MAKS_JARAK_KM);
}

function kalimatTanggal(selisih: number): string {
  if (selisih === 0) return "panen di hari yang sama";
  const n = Math.abs(selisih);
  return selisih < 0
    ? `panen ${n} hari sebelum tanggal butuh`
    : `panen ${n} hari setelah tanggal butuh`;
}

/** Kalimat singkat yang menjelaskan skor, ditampilkan di kartu hasil. */
export function buatAlasan(
  selisih: number,
  sisaKg: number,
  butuhKg: number,
  km: number,
): string {
  const stok =
    sisaKg >= butuhKg ? "stok cukup" : `stok ${sisaKg} dari ${butuhKg} kg`;
  return `${kalimatTanggal(selisih)} · ${stok} · ${Math.round(km)} km`;
}

/**
 * Urutkan listing yang cocok dengan kebutuhan pembeli.
 * Urutan: skor tertinggi → harga termurah → jarak terdekat.
 */
export function cocokkan(
  kebutuhan: KebutuhanMatching,
  kandidat: KandidatMatching[],
  opsi: OpsiMatching = {},
): HasilMatching[] {
  if (!(kebutuhan.jumlah_kg > 0)) {
    throw new Error("jumlah_kg kebutuhan harus lebih dari 0");
  }
  const dikecualikan = new Set(opsi.kecualikanListing ?? []);

  const hasil = kandidat.flatMap(({ listing, penjual, lokasi }) => {
    if (dikecualikan.has(listing.id)) return [];
    if (listing.komoditas_id !== kebutuhan.komoditas_id) return [];
    if (listing.status === "habis" || listing.sisa_kg <= 0) return [];

    const selisih = selisihHari(listing.tgl_panen, kebutuhan.tgl_butuh);
    if (Math.abs(selisih) > MAKS_SELISIH_HARI) return [];

    const km = jarakKm(lokasi, kebutuhan.lokasi);
    const skor =
      100 *
      (BOBOT.tanggal * skorTanggal(selisih) +
        BOBOT.jumlah * skorJumlah(listing.sisa_kg, kebutuhan.jumlah_kg) +
        BOBOT.jarak * skorJarak(km));

    return [
      {
        listing,
        penjual,
        skor: Math.round(skor),
        jarak_km: Math.round(km * 10) / 10,
        selisih_hari: selisih,
        alasan: buatAlasan(selisih, listing.sisa_kg, kebutuhan.jumlah_kg, km),
      } satisfies HasilMatching,
    ];
  });

  hasil.sort(
    (a, b) =>
      b.skor - a.skor ||
      hargaBerlaku(a.listing) - hargaBerlaku(b.listing) ||
      a.jarak_km - b.jarak_km,
  );
  return opsi.batas ? hasil.slice(0, opsi.batas) : hasil;
}
