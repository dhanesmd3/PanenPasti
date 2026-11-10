import { describe, expect, it } from "vitest";
import { jenisRute, lanjutAman, perluPeran, tujuanAlih } from "./akses";

describe("jenisRute", () => {
  it.each([
    ["/penjual", "penjual"],
    ["/penjual/panen", "penjual"],
    ["/pembeli", "pembeli"],
    ["/pembeli/cari", "pembeli"],
    ["/notifikasi", "login"],
    ["/masuk", "tamu"],
    ["/daftar", "tamu"],
    ["/", "bebas"],
    ["/tentang", "bebas"],
    ["/api/orders", "bebas"],
    ["/api/ai/kebutuhan", "bebas"],
    // awalan mirip tidak boleh ikut terlindungi atau terbuka
    ["/penjualan", "bebas"],
    ["/pembelian/cari", "bebas"],
  ] as const)("%s → %s", (pathname, jenis) => {
    expect(jenisRute(pathname)).toBe(jenis);
  });

  it("peran hanya perlu dibaca untuk rute khusus peran dan halaman tamu", () => {
    expect(perluPeran("penjual")).toBe(true);
    expect(perluPeran("pembeli")).toBe(true);
    expect(perluPeran("tamu")).toBe(true);
    expect(perluPeran("login")).toBe(false);
    expect(perluPeran("bebas")).toBe(false);
  });
});

describe("tujuanAlih", () => {
  it("belum login: halaman terlindungi diarahkan ke /masuk dengan tujuan asal", () => {
    expect(tujuanAlih({ pathname: "/penjual/panen", login: false, peran: null })).toBe(
      "/masuk?lanjut=%2Fpenjual%2Fpanen",
    );
    expect(tujuanAlih({ pathname: "/pembeli/cari", search: "?q=cabai", login: false, peran: null })).toBe(
      "/masuk?lanjut=%2Fpembeli%2Fcari%3Fq%3Dcabai",
    );
    expect(tujuanAlih({ pathname: "/notifikasi", login: false, peran: null })).toBe(
      "/masuk?lanjut=%2Fnotifikasi",
    );
  });

  it("belum login: halaman publik dan halaman masuk/daftar boleh dibuka", () => {
    for (const pathname of ["/", "/tentang", "/masuk", "/daftar", "/api/harga/prediksi"]) {
      expect(tujuanAlih({ pathname, login: false, peran: null })).toBeNull();
    }
  });

  it("penjual hanya boleh di /penjual/*", () => {
    expect(tujuanAlih({ pathname: "/penjual/harga", login: true, peran: "penjual" })).toBeNull();
    expect(tujuanAlih({ pathname: "/pembeli", login: true, peran: "penjual" })).toBe("/penjual");
    expect(tujuanAlih({ pathname: "/pembeli/katalog", login: true, peran: "penjual" })).toBe("/penjual");
  });

  it("pembeli hanya boleh di /pembeli/*", () => {
    expect(tujuanAlih({ pathname: "/pembeli/pesanan", login: true, peran: "pembeli" })).toBeNull();
    expect(tujuanAlih({ pathname: "/penjual", login: true, peran: "pembeli" })).toBe("/pembeli");
    expect(tujuanAlih({ pathname: "/penjual/pesanan", login: true, peran: "pembeli" })).toBe("/pembeli");
  });

  it("sudah login: /masuk dan /daftar diarahkan ke beranda peran", () => {
    expect(tujuanAlih({ pathname: "/masuk", login: true, peran: "penjual" })).toBe("/penjual");
    expect(tujuanAlih({ pathname: "/daftar", login: true, peran: "pembeli" })).toBe("/pembeli");
  });

  it("notifikasi dan halaman publik terbuka untuk kedua peran", () => {
    for (const peran of ["penjual", "pembeli"] as const) {
      expect(tujuanAlih({ pathname: "/notifikasi", login: true, peran })).toBeNull();
      expect(tujuanAlih({ pathname: "/", login: true, peran })).toBeNull();
      expect(tujuanAlih({ pathname: "/api/orders", login: true, peran })).toBeNull();
    }
  });

  it("login tanpa profil: tidak masuk area peran, dan tidak berputar-putar di /masuk", () => {
    expect(tujuanAlih({ pathname: "/penjual", login: true, peran: null })).toBe("/");
    expect(tujuanAlih({ pathname: "/pembeli/cari", login: true, peran: null })).toBe("/");
    expect(tujuanAlih({ pathname: "/masuk", login: true, peran: null })).toBeNull();
    expect(tujuanAlih({ pathname: "/", login: true, peran: null })).toBeNull();
  });
});

describe("lanjutAman", () => {
  it("menerima path di area peran sendiri dan /notifikasi", () => {
    expect(lanjutAman("/penjual/pesanan", "penjual")).toBe("/penjual/pesanan");
    expect(lanjutAman("/pembeli/cari?q=cabai", "pembeli")).toBe("/pembeli/cari?q=cabai");
    expect(lanjutAman("/notifikasi", "pembeli")).toBe("/notifikasi");
  });

  it.each([
    [null],
    [undefined],
    [""],
    ["https://jahat.example/penjual"],
    ["//jahat.example/penjual"],
    ["/\\jahat.example"],
    ["penjual/pesanan"],
    ["/pembeli/cari"], // area peran lain
    ["/masuk"],
    ["/"],
    ["/api/orders"],
  ])("menolak %j dan kembali ke beranda", (nilai) => {
    expect(lanjutAman(nilai, "penjual")).toBe("/penjual");
  });
});
