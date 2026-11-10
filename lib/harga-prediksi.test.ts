import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { bacaCsvHarga } from "./harga-csv";
import { pilihMingguPanen, susunPrediksi } from "./harga-prediksi";

const data = bacaCsvHarga(readFileSync("data/harga/cabai_rawit_merah_pihps.csv", "utf-8"));

describe("susunPrediksi (data PIHPS asli)", () => {
  const p = susunPrediksi(data, "uji");

  it("berisi 26 minggu riwayat dan 4 minggu prediksi", () => {
    expect(p.historis).toHaveLength(26);
    expect(p.prediksi_grosir).toHaveLength(4);
    expect(p.prediksi_petani).toHaveLength(4);
    expect(p.data_sampai).toBe("2026-11-06");
    expect(p.prediksi_grosir[0].tanggal).toBe("2026-11-09");
  });

  it("harga petani = harga grosir × rasio, dan lebih rendah dari grosir", () => {
    expect(p.rasio_petani).toBeGreaterThan(0);
    expect(p.rasio_petani).toBeLessThan(1);
    p.prediksi_petani.forEach((t, i) => {
      expect(t.nilai).toBeLessThan(p.prediksi_grosir[i].nilai);
    });
  });

  it("saran konsisten dengan perubahan harga", () => {
    expect(p.saran === "tahan").toBe(p.perubahan > 0.03);
  });
});

describe("pilihMingguPanen", () => {
  const p = susunPrediksi(data, "uji");
  const pred = p.prediksi_petani;

  it("memilih minggu yang memuat tanggal panen", () => {
    expect(pilihMingguPanen(pred, "2026-11-19").tanggal).toBe("2026-11-16");
  });
  it("tanpa tanggal atau sebelum rentang → minggu pertama", () => {
    expect(pilihMingguPanen(pred).tanggal).toBe(pred[0].tanggal);
    expect(pilihMingguPanen(pred, "2026-10-01").tanggal).toBe(pred[0].tanggal);
  });
  it("setelah rentang → minggu terakhir", () => {
    expect(pilihMingguPanen(pred, "2027-01-15").tanggal).toBe(pred[3].tanggal);
  });
});
