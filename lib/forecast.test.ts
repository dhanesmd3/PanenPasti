import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  prediksiHarga,
  rasioHarga,
  rataMingguan,
  saranJual,
  skalakan,
  type TitikHarga,
} from "./forecast";
import { bacaCsvHarga, pilihSeri } from "./harga-csv";
import { tambahHari } from "./tanggal";

/** Seri harian (Senin–Jumat) mulai `mulai`, harga = f(minggu ke-i). */
function seri(mulai: string, minggu: number, f: (i: number) => number): TitikHarga[] {
  return Array.from({ length: minggu }, (_, i) =>
    [0, 1, 2, 3, 4].map((d) => ({ tanggal: tambahHari(mulai, 7 * i + d), harga: f(i) })),
  ).flat();
}

describe("rataMingguan", () => {
  it("mengelompokkan per minggu dengan Senin sebagai awal", () => {
    const m = rataMingguan([
      { tanggal: "2026-11-02", harga: 100 },
      { tanggal: "2026-11-06", harga: 200 },
      { tanggal: "2026-11-09", harga: 300 },
    ]);
    expect(m).toEqual([
      { tanggal: "2026-11-02", harga: 150 },
      { tanggal: "2026-11-09", harga: 300 },
    ]);
  });
});

describe("prediksiHarga", () => {
  it("harga stabil → prediksi sama dan dimulai Senin minggu berikutnya", () => {
    const p = prediksiHarga(seri("2026-01-05", 30, () => 50000));
    expect(p).toHaveLength(4);
    expect(p[0].tanggal).toBe("2026-08-03");
    for (const t of p) expect(t.nilai).toBe(50000);
  });

  it("harga melonjak di atas rata-rata → diperkirakan turun pelan-pelan", () => {
    const p = prediksiHarga(seri("2026-01-05", 30, (i) => (i >= 28 ? 80000 : 50000)));
    expect(p[0].nilai).toBeLessThan(80000);
    expect(p[0].nilai).toBeGreaterThan(50000);
    expect(p[3].nilai).toBeLessThan(p[0].nilai);
  });

  it("rentang selalu mengapit nilai", () => {
    const p = prediksiHarga(seri("2026-01-05", 40, (i) => 50000 + 8000 * Math.sin(i)));
    for (const t of p) {
      expect(t.bawah).toBeLessThanOrEqual(t.nilai);
      expect(t.atas).toBeGreaterThanOrEqual(t.nilai);
    }
  });

  it("menolak data yang terlalu sedikit", () => {
    expect(() => prediksiHarga(seri("2026-01-05", 10, () => 50000))).toThrow(/kurang/);
  });
});

describe("saranJual & konversi harga petani", () => {
  it("tahan hanya jika perkiraan naik lebih dari 3%", () => {
    expect(saranJual(60000, 63000)).toBe("tahan");
    expect(saranJual(60000, 61000)).toBe("jual");
    expect(saranJual(60000, 55000)).toBe("jual");
  });

  it("menghitung rasio dari jendela 90 hari terakhir", () => {
    const petani = [
      { tanggal: "2026-01-01", harga: 10000 }, // di luar jendela
      { tanggal: "2026-11-01", harga: 60000 },
    ];
    const grosir = [{ tanggal: "2026-11-01", harga: 75000 }];
    expect(rasioHarga(petani, grosir)).toBeCloseTo(0.8);
    const [t] = skalakan([{ tanggal: "2026-11-09", nilai: 80000, bawah: 70000, atas: 90000 }], 0.8);
    expect(t).toEqual({ tanggal: "2026-11-09", nilai: 64000, bawah: 56000, atas: 72000 });
  });
});

describe("data PIHPS asli (Kota Bandung, pedagang besar)", () => {
  const data = bacaCsvHarga(readFileSync("data/harga/cabai_rawit_merah_pihps.csv", "utf-8"));
  const grosir = pilihSeri(data, "Kota Bandung", "pedagang_besar");
  const petani = pilihSeri(data, "Kab. Garut", "produsen");

  it("menghasilkan 4 minggu prediksi yang masuk akal", () => {
    const p = prediksiHarga(grosir);
    expect(p).toHaveLength(4);
    for (const t of p) {
      expect(t.nilai).toBeGreaterThan(10000);
      expect(t.nilai).toBeLessThan(200000);
    }
    const rasio = rasioHarga(petani, grosir);
    expect(rasio).toBeGreaterThan(0.3);
    expect(rasio).toBeLessThan(1.2);
  });

  it("uji mundur: tidak lebih buruk dari tebakan naif dan rentang 80% terkalibrasi", () => {
    const mingguan = rataMingguan(grosir);
    const g = Array.from({ length: 4 }, () => ({ model: [] as number[], naif: [] as number[], masuk: [] as number[] }));
    // Latih hanya dengan data s.d. minggu t, lalu tebak t+1..t+4.
    for (let t = 40; t + 4 < mingguan.length; t++) {
      const latih = grosir.filter((d) => d.tanggal < mingguan[t + 1].tanggal);
      const p = prediksiHarga(latih);
      p.forEach((pt, i) => {
        const aktual = mingguan[t + 1 + i].harga;
        g[i].model.push(Math.abs(pt.nilai - aktual) / aktual);
        g[i].naif.push(Math.abs(mingguan[t].harga - aktual) / aktual);
        g[i].masuk.push(aktual >= pt.bawah && aktual <= pt.atas ? 1 : 0);
      });
    }
    const pct = (xs: number[]) => (100 * xs.reduce((s, x) => s + x, 0)) / xs.length;
    const ringkasan = g.map((x, i) => ({
      minggu_ke: i + 1,
      meleset_model: `${pct(x.model).toFixed(1)}%`,
      meleset_naif: `${pct(x.naif).toFixed(1)}%`,
      dalam_rentang: `${pct(x.masuk).toFixed(0)}%`,
    }));
    console.table(ringkasan);

    const rataModel = g.reduce((s, x) => s + pct(x.model), 0) / 4;
    const rataNaif = g.reduce((s, x) => s + pct(x.naif), 0) / 4;
    expect(rataModel).toBeLessThanOrEqual(rataNaif * 1.02);
    for (const x of g) {
      expect(pct(x.masuk)).toBeGreaterThanOrEqual(65);
      expect(pct(x.masuk)).toBeLessThanOrEqual(95);
    }
  });
});
