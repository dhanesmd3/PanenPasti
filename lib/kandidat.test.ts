import { describe, expect, it } from "vitest";
import type { Kecamatan } from "@/types";
import { bangunKandidat, type BarisListingDb } from "./kandidat";

const kec: Kecamatan = { id: 3205120, nama: "Cikajang", kab_kota: "Kab. Garut", lat: -7.39, lng: 107.8 };
const cari = (id: number) => (id === kec.id ? kec : undefined);

function baris(isi: Partial<BarisListingDb>): BarisListingDb {
  return {
    id: "l1",
    penjual_id: "p1",
    komoditas_id: 1,
    jumlah_kg: 500,
    sisa_kg: 500,
    kualitas: null,
    tgl_panen: "2026-11-28",
    harga_per_kg: 60000,
    foto_url: null,
    status: "estimasi",
    is_surplus: false,
    harga_surplus: null,
    penjual: { id: "p1", nama: "A", nama_usaha: null, kecamatan_id: kec.id },
    ...isi,
  };
}

describe("bangunKandidat", () => {
  it("mengubah angka string dari Postgres numeric menjadi number", () => {
    const [k] = bangunKandidat(
      [baris({ sisa_kg: "120.5" as unknown as number, harga_per_kg: "60000" as unknown as number })],
      cari,
    );
    expect(k.listing.sisa_kg).toBe(120.5);
    expect(k.listing.harga_per_kg).toBe(60000);
    expect(k.lokasi).toEqual({ lat: -7.39, lng: 107.8 });
    expect(k.listing).not.toHaveProperty("penjual");
  });

  it("melewati baris tanpa penjual atau dengan kecamatan tak dikenal", () => {
    const hasil = bangunKandidat(
      [
        baris({ penjual: null }),
        baris({ id: "l2", penjual: { id: "p2", nama: "B", nama_usaha: null, kecamatan_id: 1 } }),
        baris({ id: "l3" }),
      ],
      cari,
    );
    expect(hasil.map((k) => k.listing.id)).toEqual(["l3"]);
  });
});
