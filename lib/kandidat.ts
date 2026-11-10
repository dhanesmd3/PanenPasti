// Ubah baris listing dari database menjadi kandidat matching.
// Dipisah dari route agar bisa diuji tanpa database.

import type { Kecamatan, Listing } from "@/types";
import type { KandidatMatching } from "./matching";

/** Kolom yang di-select oleh /api/match (lihat KOLOM_LISTING_MATCH). */
export type BarisListingDb = Listing & {
  penjual: { id: string; nama: string; nama_usaha: string | null; kecamatan_id: number } | null;
};

export const KOLOM_LISTING_MATCH =
  "id, penjual_id, komoditas_id, jumlah_kg, sisa_kg, kualitas, tgl_panen, harga_per_kg, foto_url, status, is_surplus, harga_surplus, penjual:profiles!penjual_id(id, nama, nama_usaha, kecamatan_id)";

export function bangunKandidat(
  baris: BarisListingDb[],
  cariKecamatan: (id: number) => Kecamatan | undefined,
): KandidatMatching[] {
  return baris.flatMap(({ penjual, ...listing }) => {
    if (!penjual) return [];
    const kec = cariKecamatan(penjual.kecamatan_id);
    if (!kec) return [];
    return [
      {
        listing: {
          ...listing,
          // Kolom numeric Postgres bisa datang sebagai string.
          jumlah_kg: Number(listing.jumlah_kg),
          sisa_kg: Number(listing.sisa_kg),
          harga_per_kg: Number(listing.harga_per_kg),
          harga_surplus: listing.harga_surplus == null ? null : Number(listing.harga_surplus),
        },
        penjual,
        lokasi: { lat: kec.lat, lng: kec.lng },
      },
    ];
  });
}
