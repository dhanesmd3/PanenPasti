import { describe, expect, it } from "vitest";
import {
  aksiTersedia,
  adalahStatusPesanan,
  bolehPindah,
  keListing,
  keOrder,
  kontakTerbuka,
  normalisasiNoHp,
  STATUS_PESANAN,
  susunPesananLengkap,
  tautanWa,
  TRANSISI,
  type BarisKontak,
} from "./pesanan";

describe("aturan status pesanan (PRD bagian 10)", () => {
  it("penjual dan pembeli mendapat aksi yang sesuai untuk tiap status", () => {
    expect(aksiTersedia("menunggu", "penjual")).toEqual(["dikonfirmasi", "ditolak"]);
    expect(aksiTersedia("menunggu", "pembeli")).toEqual(["dibatalkan"]);
    expect(aksiTersedia("dikonfirmasi", "penjual")).toEqual(["dikirim", "gagal_panen"]);
    expect(aksiTersedia("dikonfirmasi", "pembeli")).toEqual([]);
    expect(aksiTersedia("dikirim", "pembeli")).toEqual(["selesai"]);
    expect(aksiTersedia("dikirim", "penjual")).toEqual([]);
  });

  it("status akhir tidak punya aksi lagi", () => {
    for (const status of ["selesai", "ditolak", "dibatalkan", "gagal_panen"] as const) {
      expect(aksiTersedia(status, "penjual")).toEqual([]);
      expect(aksiTersedia(status, "pembeli")).toEqual([]);
    }
  });

  it("tidak ada perpindahan kembali ke menunggu atau ke status yang sama", () => {
    for (const dari of STATUS_PESANAN) {
      expect(TRANSISI[dari].menunggu).toBeUndefined();
      expect(TRANSISI[dari][dari]).toBeUndefined();
    }
  });

  it("bolehPindah mengikuti tabel", () => {
    expect(bolehPindah("menunggu", "dikonfirmasi", "penjual")).toBe(true);
    expect(bolehPindah("menunggu", "dikonfirmasi", "pembeli")).toBe(false);
    expect(bolehPindah("dikonfirmasi", "dibatalkan", "pembeli")).toBe(false);
    expect(bolehPindah("selesai", "dikirim", "penjual")).toBe(false);
  });

  it("kontak terbuka hanya saat dikonfirmasi, dikirim, selesai", () => {
    const terbuka = STATUS_PESANAN.filter(kontakTerbuka);
    expect(terbuka).toEqual(["dikonfirmasi", "dikirim", "selesai"]);
  });

  it("adalahStatusPesanan menolak nilai asing", () => {
    expect(adalahStatusPesanan("dikirim")).toBe(true);
    expect(adalahStatusPesanan("ngawur")).toBe(false);
    expect(adalahStatusPesanan(null)).toBe(false);
    expect(adalahStatusPesanan(3)).toBe(false);
  });
});

describe("nomor HP dan tautan WhatsApp", () => {
  it.each([
    ["081200000101", "6281200000101"],
    ["0812-0000-0101", "6281200000101"],
    ["+62 812 0000 0101", "6281200000101"],
    ["6281200000101", "6281200000101"],
    ["81200000101", "6281200000101"],
  ])("%s → %s", (masukan, harapan) => {
    expect(normalisasiNoHp(masukan)).toBe(harapan);
  });

  it.each([[""], ["abc"], ["12345"], ["0812"], [null], [undefined], ["62" + "1".repeat(14)]])(
    "menolak %j",
    (masukan) => {
      expect(normalisasiNoHp(masukan)).toBeNull();
    },
  );

  it("membentuk tautan wa.me", () => {
    expect(tautanWa("0812-0000-0101")).toBe("https://wa.me/6281200000101");
    expect(tautanWa(null)).toBeNull();
    expect(tautanWa("bukan nomor")).toBeNull();
  });
});

const ID = {
  order: "11111111-1111-4111-8111-111111111111",
  listing: "22222222-2222-4222-8222-222222222222",
  penjual: "33333333-3333-4333-8333-333333333333",
  pembeli: "44444444-4444-4444-8444-444444444444",
  lain: "55555555-5555-4555-8555-555555555555",
};

function barisPesanan(status: string) {
  return {
    id: ID.order,
    listing_id: ID.listing,
    pembeli_id: ID.pembeli,
    kebutuhan_id: null,
    // numeric Postgres bisa datang sebagai string
    jumlah_kg: "20.50",
    harga_per_kg: 62000,
    status,
    alasan_batal: null,
    dibuat_pada: "2026-11-10T03:00:00+00:00",
    diubah_pada: "2026-11-10T03:00:00+00:00",
    listing: {
      id: ID.listing,
      penjual_id: ID.penjual,
      komoditas_id: 1,
      jumlah_kg: "500.00",
      sisa_kg: "479.50",
      kualitas: "Super",
      tgl_panen: "2026-12-01",
      harga_per_kg: 62000,
      foto_url: null,
      status: "estimasi",
      is_surplus: false,
      harga_surplus: null,
      penjual: { id: ID.penjual, nama: "Asep", nama_usaha: "Tani Pasir Hejo", kecamatan_id: 3205120 },
    },
    pembeli: { id: ID.pembeli, nama: "Siti", nama_usaha: null, kecamatan_id: 3273240 },
  };
}

const kontakPenjual: BarisKontak = {
  order_id: ID.order,
  user_id: ID.penjual,
  peran: "penjual",
  nama: "Asep",
  nama_usaha: "Tani Pasir Hejo",
  no_hp: "6281200000101",
};

describe("baris database → tipe bersama", () => {
  it("keOrder dan keListing memaksa numeric menjadi number", () => {
    const b = barisPesanan("menunggu");
    expect(keOrder(b)).toEqual({
      id: ID.order,
      listing_id: ID.listing,
      pembeli_id: ID.pembeli,
      kebutuhan_id: null,
      jumlah_kg: 20.5,
      harga_per_kg: 62000,
      status: "menunggu",
      alasan_batal: null,
      dibuat_pada: "2026-11-10T03:00:00+00:00",
      diubah_pada: "2026-11-10T03:00:00+00:00",
    });
    const l = keListing(b.listing);
    expect(l.jumlah_kg).toBe(500);
    expect(l.sisa_kg).toBe(479.5);
    expect(l.harga_surplus).toBeNull();
    expect(l).not.toHaveProperty("penjual");
  });

  it("menyusun pesanan untuk pembeli: total, aksi, tanpa kontak saat menunggu", () => {
    const p = susunPesananLengkap(barisPesanan("menunggu"), ID.pembeli, new Map());
    expect(p).toMatchObject({
      peran_saya: "pembeli",
      aksi: ["dibatalkan"],
      kontak: null,
      total_harga: 1_271_000,
      penjual: { nama: "Asep" },
      pembeli: { nama: "Siti" },
    });
  });

  it("menyusun pesanan untuk penjual", () => {
    const p = susunPesananLengkap(barisPesanan("menunggu"), ID.penjual, new Map());
    expect(p).toMatchObject({ peran_saya: "penjual", aksi: ["dikonfirmasi", "ditolak"] });
  });

  it("menyertakan kontak dan tautan WhatsApp setelah dikonfirmasi", () => {
    const peta = new Map([[ID.order, kontakPenjual]]);
    const p = susunPesananLengkap(barisPesanan("dikonfirmasi"), ID.pembeli, peta);
    expect(p?.kontak).toEqual({
      nama: "Asep",
      nama_usaha: "Tani Pasir Hejo",
      no_hp: "6281200000101",
      wa_url: "https://wa.me/6281200000101",
    });
  });

  it("tidak membocorkan kontak jika status tidak membukanya, walau barisnya ada", () => {
    const peta = new Map([[ID.order, kontakPenjual]]);
    for (const status of ["menunggu", "ditolak", "dibatalkan", "gagal_panen"]) {
      expect(susunPesananLengkap(barisPesanan(status), ID.pembeli, peta)?.kontak).toBeNull();
    }
  });

  it("mengembalikan null untuk orang di luar pesanan atau baris yang tidak lengkap", () => {
    expect(susunPesananLengkap(barisPesanan("menunggu"), ID.lain, new Map())).toBeNull();
    const tanpaListing = { ...barisPesanan("menunggu"), listing: null };
    expect(susunPesananLengkap(tanpaListing, ID.pembeli, new Map())).toBeNull();
  });
});
