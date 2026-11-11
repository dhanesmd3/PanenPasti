import { describe, expect, it } from "vitest";
import { tujuanNotifikasi, waktuLalu } from "./notifikasi";

describe("waktuLalu", () => {
  // 11 Nov 2026 15.00 WIB
  const sekarang = new Date("2026-11-11T08:00:00Z");
  it("menit dan jam di hari yang sama", () => {
    expect(waktuLalu("2026-11-11T07:59:30Z", sekarang)).toBe("baru saja");
    expect(waktuLalu("2026-11-11T07:55:00Z", sekarang)).toBe("5 menit lalu");
    expect(waktuLalu("2026-11-11T01:00:00Z", sekarang)).toBe("7 jam lalu");
  });
  it("memakai tanggal WIB, bukan UTC", () => {
    // 10 Nov 18.00 UTC = 11 Nov 01.00 WIB → masih hari ini
    expect(waktuLalu("2026-11-10T18:00:00Z", sekarang)).toBe("14 jam lalu");
    expect(waktuLalu("2026-11-10T10:00:00Z", sekarang)).toBe("kemarin");
    expect(waktuLalu("2026-11-02T10:00:00Z", sekarang)).toBe("2 Nov");
  });
});

describe("tujuanNotifikasi", () => {
  it("surplus ke detail listing untuk pembeli", () => {
    expect(tujuanNotifikasi({ tipe: "surplus", order_id: null, listing_id: "L1" }, "pembeli")).toBe(
      "/pembeli/katalog/L1",
    );
  });
  it("notifikasi pesanan ke halaman pesanan sesuai peran", () => {
    const n = { tipe: "status_berubah", order_id: "O1", listing_id: "L1" } as const;
    expect(tujuanNotifikasi(n, "penjual")).toBe("/penjual/pesanan");
    expect(tujuanNotifikasi(n, "pembeli")).toBe("/pembeli/pesanan");
    expect(tujuanNotifikasi(n, null)).toBeNull();
  });
});
