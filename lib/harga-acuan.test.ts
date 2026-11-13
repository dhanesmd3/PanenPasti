import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { bacaCsvHarga } from "./harga-csv";
import { bandingkanHarga, susunHargaAcuan } from "./harga-acuan";

const data = bacaCsvHarga(readFileSync("data/harga/cabai_rawit_merah_pihps.csv", "utf-8"));

describe("susunHargaAcuan (data PIHPS asli)", () => {
  const a = susunHargaAcuan(1, data, "uji")!;

  it("memakai minggu terakhir yang ada datanya", () => {
    expect(a.data_sampai).toBe("2026-11-06");
    expect(a.minggu).toBe("2026-11-02");
    expect(a.wilayah).toBe("Kota Bandung");
  });

  it("harga pasar di atas grosir, dibulatkan ke ratusan", () => {
    expect(a.pasar_per_kg).toBeGreaterThan(a.grosir_per_kg);
    expect(a.pasar_per_kg % 100).toBe(0);
    expect(a.grosir_per_kg % 100).toBe(0);
  });

  it("null untuk komoditas tanpa data", () => {
    expect(susunHargaAcuan(2, [], "uji")).toBeNull();
  });
});

describe("bandingkanHarga", () => {
  it("lebih murah dari acuan", () => {
    expect(bandingkanHarga(60000, 80000)).toEqual({ selisih: 20000, persen: 0.25, arah: "lebih_murah" });
  });

  it("lebih mahal dari acuan", () => {
    const b = bandingkanHarga(88000, 80000);
    expect(b.arah).toBe("lebih_mahal");
    expect(b.selisih).toBe(-8000);
  });

  it("beda di bawah 1% dianggap setara", () => {
    expect(bandingkanHarga(79500, 80000).arah).toBe("setara");
  });
});
