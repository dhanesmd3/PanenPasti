import { describe, expect, it } from "vitest";
import { awalMinggu, bulanDari, keNomorHari, selisihHari, tambahHari } from "./tanggal";

describe("tanggal", () => {
  it("menghitung selisih hari lintas bulan dan tahun", () => {
    expect(selisihHari("2026-12-01", "2026-11-28")).toBe(3);
    expect(selisihHari("2027-01-01", "2026-12-31")).toBe(1);
    expect(selisihHari("2026-11-01", "2026-11-08")).toBe(-7);
  });

  it("menambah hari", () => {
    expect(tambahHari("2026-11-28", 7)).toBe("2026-12-05");
    expect(tambahHari("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("mencari hari Senin di minggu yang sama", () => {
    expect(awalMinggu("2026-11-08")).toBe("2026-11-02"); // Minggu
    expect(awalMinggu("2026-11-09")).toBe("2026-11-09"); // Senin
    expect(awalMinggu("2026-11-14")).toBe("2026-11-09"); // Sabtu
  });

  it("menolak tanggal yang tidak valid", () => {
    expect(() => keNomorHari("2026-02-30")).toThrow();
    expect(() => keNomorHari("8/11/2026")).toThrow();
    expect(bulanDari("2026-11-08")).toBe(11);
  });
});
