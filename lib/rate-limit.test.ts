import { beforeEach, describe, expect, it } from "vitest";
import { kunciPembatas, periksaBatas, resetBatas } from "./rate-limit";
import { konteksKalender, tanggalWajar } from "./ai/kalender";
import { hariIniWib, tanggalPanjang } from "./tanggal";

describe("periksaBatas", () => {
  beforeEach(() => resetBatas());

  it("menolak setelah batas tercapai, lalu membuka lagi setelah jendela lewat", () => {
    const t0 = 1_000_000;
    expect(periksaBatas("a", 2, 60_000, t0).boleh).toBe(true);
    expect(periksaBatas("a", 2, 60_000, t0 + 1).boleh).toBe(true);
    const ditolak = periksaBatas("a", 2, 60_000, t0 + 2);
    expect(ditolak.boleh).toBe(false);
    expect(ditolak.cobaLagiDetik).toBe(60);
    expect(periksaBatas("b", 2, 60_000, t0 + 2).boleh).toBe(true); // kunci lain terpisah
    expect(periksaBatas("a", 2, 60_000, t0 + 60_001).boleh).toBe(true);
  });

  it("memakai id pengguna jika ada, selain itu IP pertama", () => {
    const h = new Headers({ "x-forwarded-for": "10.0.0.1, 10.0.0.2" });
    expect(kunciPembatas(h, "u1")).toBe("user:u1");
    expect(kunciPembatas(h)).toBe("ip:10.0.0.1");
    expect(kunciPembatas(new Headers())).toBe("ip:lokal");
  });
});

describe("kalender untuk prompt", () => {
  it("hari ini dihitung dalam WIB", () => {
    expect(hariIniWib(new Date("2026-11-09T18:00:00Z"))).toBe("2026-11-10"); // 01.00 WIB
    expect(tanggalPanjang("2026-11-10")).toBe("Selasa, 10 November 2026");
  });

  it("memuat hari ini, besok, dan akhir bulan", () => {
    const k = konteksKalender("2026-11-10");
    expect(k).toContain("2026-11-10 Selasa (hari ini)");
    expect(k).toContain("2026-11-11 Rabu (besok)");
    expect(k).toContain("Akhir bulan ini: 2026-11-30");
  });

  it("tanggalWajar hanya menerima hari ini s.d. 120 hari ke depan", () => {
    expect(tanggalWajar("2026-11-10", "2026-11-10")).toBe(true);
    expect(tanggalWajar("2026-11-09", "2026-11-10")).toBe(false);
    expect(tanggalWajar("2027-06-01", "2026-11-10")).toBe(false);
    expect(tanggalWajar("bukan-tanggal", "2026-11-10")).toBe(false);
  });
});
