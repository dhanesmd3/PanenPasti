import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Listing } from "@/types";
import {
  cocokkan,
  jarakKm,
  type KandidatMatching,
  type KebutuhanMatching,
} from "./matching";

// Koordinat asli dari data/kecamatan.csv
const kecamatan = new Map(
  readFileSync("data/kecamatan.csv", "utf-8")
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((b) => {
      const [id, nama, , lat, lng] = b.split(",");
      return [nama, { id: Number(id), lat: Number(lat), lng: Number(lng) }];
    }),
);
const lokasi = (nama: string) => {
  const k = kecamatan.get(nama);
  if (!k) throw new Error(`Kecamatan ${nama} tidak ada di CSV`);
  return { lat: k.lat, lng: k.lng };
};

function listing(id: string, isi: Partial<Listing> = {}): Listing {
  return {
    id,
    penjual_id: `pj-${id}`,
    komoditas_id: 1,
    jumlah_kg: 500,
    sisa_kg: 500,
    kualitas: "Super",
    tgl_panen: "2026-11-28",
    harga_per_kg: 60000,
    foto_url: null,
    status: "estimasi",
    is_surplus: false,
    harga_surplus: null,
    ...isi,
  };
}

function kandidat(l: Listing, kec = "Cikajang"): KandidatMatching {
  return {
    listing: l,
    penjual: { id: l.penjual_id, nama: "Penjual", nama_usaha: null, kecamatan_id: 0 },
    lokasi: lokasi(kec),
  };
}

const kebutuhan: KebutuhanMatching = {
  komoditas_id: 1,
  jumlah_kg: 100,
  tgl_butuh: "2026-11-28",
  lokasi: lokasi("Coblong"),
};

describe("jarakKm", () => {
  it("sesuai jarak garis lurus Garut Kota → Sumur Bandung (±46 km)", () => {
    const km = jarakKm(lokasi("Garut Kota"), lokasi("Sumur Bandung"));
    expect(km).toBeGreaterThan(44);
    expect(km).toBeLessThan(48);
  });
  it("nol untuk titik yang sama", () => {
    expect(jarakKm(lokasi("Coblong"), lokasi("Coblong"))).toBe(0);
  });
});

describe("cocokkan", () => {
  it("memberi skor 100 untuk kecocokan sempurna", () => {
    const [h] = cocokkan(
      { ...kebutuhan, lokasi: lokasi("Cikajang") },
      [kandidat(listing("a"))],
    );
    expect(h.skor).toBe(100);
    expect(h.alasan).toBe("panen di hari yang sama · stok cukup · 0 km");
  });

  it("menyaring komoditas lain, stok habis, dan selisih tanggal > 7 hari", () => {
    const hasil = cocokkan(kebutuhan, [
      kandidat(listing("ok")),
      kandidat(listing("komoditas-lain", { komoditas_id: 2 })),
      kandidat(listing("habis", { status: "habis" })),
      kandidat(listing("sisa-nol", { sisa_kg: 0 })),
      kandidat(listing("terlalu-lambat", { tgl_panen: "2026-12-06" })),
      kandidat(listing("terlalu-cepat", { tgl_panen: "2026-11-20" })),
      kandidat(listing("batas-7-hari", { tgl_panen: "2026-12-05" })),
    ]);
    expect(hasil.map((h) => h.listing.id)).toEqual(["ok", "batas-7-hari"]);
  });

  it("mengurutkan berdasarkan skor: tanggal paling berpengaruh", () => {
    const hasil = cocokkan(kebutuhan, [
      kandidat(listing("selisih-3", { tgl_panen: "2026-12-01" })),
      kandidat(listing("tepat")),
      kandidat(listing("stok-kurang", { sisa_kg: 50 })),
    ]);
    expect(hasil.map((h) => h.listing.id)).toEqual(["tepat", "stok-kurang", "selisih-3"]);
    expect(hasil[1].alasan).toContain("stok 50 dari 100 kg");
    expect(hasil[2].alasan).toContain("panen 3 hari setelah tanggal butuh");
  });

  it("skor sama → harga berlaku (termasuk harga surplus) yang lebih murah dulu", () => {
    const hasil = cocokkan(kebutuhan, [
      kandidat(listing("mahal", { harga_per_kg: 65000 })),
      kandidat(
        listing("surplus", { harga_per_kg: 65000, is_surplus: true, harga_surplus: 52000 }),
      ),
      kandidat(listing("sedang", { harga_per_kg: 60000 })),
    ]);
    expect(hasil.map((h) => h.listing.id)).toEqual(["surplus", "sedang", "mahal"]);
  });

  it("penjual lebih dekat mendapat skor lebih tinggi", () => {
    const hasil = cocokkan(kebutuhan, [
      kandidat(listing("jauh"), "Cibalong"),
      kandidat(listing("dekat"), "Kadungora"),
    ]);
    expect(hasil[0].listing.id).toBe("dekat");
    expect(hasil[0].skor).toBeGreaterThan(hasil[1].skor);
  });

  it("bisa mengecualikan listing (saran penjual pengganti) dan membatasi hasil", () => {
    const semua = ["a", "b", "c", "d"].map((id) => kandidat(listing(id)));
    const hasil = cocokkan(kebutuhan, semua, { kecualikanListing: ["a"], batas: 2 });
    expect(hasil).toHaveLength(2);
    expect(hasil.map((h) => h.listing.id)).not.toContain("a");
  });

  it("menolak kebutuhan dengan jumlah tidak valid", () => {
    expect(() => cocokkan({ ...kebutuhan, jumlah_kg: 0 }, [])).toThrow();
  });
});
