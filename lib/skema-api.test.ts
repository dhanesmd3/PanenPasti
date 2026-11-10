import { describe, expect, it } from "vitest";
import type { z } from "zod";
import {
  pesanValidasi,
  SkemaBuatPesanan,
  SkemaDaftar,
  SkemaMasuk,
  SkemaSurplus,
  SkemaTandaiNotifikasi,
  SkemaUbahProfil,
  SkemaUbahStatus,
} from "./skema-api";

const ID = "22222222-2222-4222-8222-222222222222";

function pesanGagal(skema: z.ZodType, nilai: unknown): string {
  const hasil = skema.safeParse(nilai);
  if (hasil.success) throw new Error("Diharapkan gagal validasi");
  return pesanValidasi(hasil.error);
}

describe("SkemaBuatPesanan", () => {
  it("menerima body sesuai kontrak", () => {
    expect(SkemaBuatPesanan.parse({ listing_id: ID, jumlah_kg: 20 })).toEqual({
      listing_id: ID,
      jumlah_kg: 20,
    });
    expect(SkemaBuatPesanan.parse({ listing_id: ID, jumlah_kg: 0.5, kebutuhan_id: ID }).kebutuhan_id).toBe(ID);
    expect(SkemaBuatPesanan.parse({ listing_id: ID, jumlah_kg: 1, kebutuhan_id: null }).kebutuhan_id).toBeNull();
  });

  it.each([
    [{ listing_id: ID }, "Jumlah pesanan harus berupa angka."],
    [{ listing_id: ID, jumlah_kg: "20" }, "Jumlah pesanan harus berupa angka."],
    [{ listing_id: ID, jumlah_kg: 0 }, "Jumlah pesanan harus lebih dari 0 kg."],
    [{ listing_id: ID, jumlah_kg: -3 }, "Jumlah pesanan harus lebih dari 0 kg."],
    [{ listing_id: ID, jumlah_kg: 100001 }, "Jumlah pesanan paling banyak 100.000 kg."],
    [{ listing_id: "abc", jumlah_kg: 1 }, "ID tidak valid."],
    [{ jumlah_kg: 1 }, "ID tidak valid."],
    [null, "Body permintaan harus berupa objek JSON."],
    [[], "Body permintaan harus berupa objek JSON."],
  ])("menolak %j", (body, pesan) => {
    expect(pesanGagal(SkemaBuatPesanan, body)).toBe(pesan);
  });

  it("menolak NaN dan Infinity", () => {
    expect(SkemaBuatPesanan.safeParse({ listing_id: ID, jumlah_kg: Number.NaN }).success).toBe(false);
    expect(SkemaBuatPesanan.safeParse({ listing_id: ID, jumlah_kg: Infinity }).success).toBe(false);
  });
});

describe("SkemaUbahStatus", () => {
  it.each(["dikonfirmasi", "dikirim", "selesai", "ditolak", "dibatalkan"])("menerima %s tanpa alasan", (status) => {
    expect(SkemaUbahStatus.parse({ status })).toEqual({ status });
  });

  it("merapikan alasan", () => {
    expect(SkemaUbahStatus.parse({ status: "ditolak", alasan: "  stok habis  " }).alasan).toBe("stok habis");
  });

  it("gagal_panen wajib beralasan", () => {
    const pesan = "Tulis alasan gagal panen supaya pembeli tahu penyebabnya.";
    expect(pesanGagal(SkemaUbahStatus, { status: "gagal_panen" })).toBe(pesan);
    expect(pesanGagal(SkemaUbahStatus, { status: "gagal_panen", alasan: "  " })).toBe(pesan);
    expect(pesanGagal(SkemaUbahStatus, { status: "gagal_panen", alasan: null })).toBe(pesan);
    expect(SkemaUbahStatus.parse({ status: "gagal_panen", alasan: "banjir di lahan" }).alasan).toBe(
      "banjir di lahan",
    );
  });

  it("menolak status menunggu, status asing, dan alasan terlalu panjang", () => {
    expect(pesanGagal(SkemaUbahStatus, { status: "menunggu" })).toBe("Status pesanan tidak dikenal.");
    expect(pesanGagal(SkemaUbahStatus, { status: "ngawur" })).toBe("Status pesanan tidak dikenal.");
    expect(pesanGagal(SkemaUbahStatus, {})).toBe("Status pesanan tidak dikenal.");
    expect(pesanGagal(SkemaUbahStatus, { status: "ditolak", alasan: "x".repeat(301) })).toBe(
      "Alasan paling panjang 300 karakter.",
    );
  });
});

describe("SkemaSurplus", () => {
  it("menerima harga bulat dalam batas", () => {
    expect(SkemaSurplus.parse({ harga_surplus: 52000 })).toEqual({ harga_surplus: 52000 });
  });

  it.each([
    [{ harga_surplus: 52000.5 }, "Harga surplus harus bilangan bulat (rupiah)."],
    [{ harga_surplus: 99 }, "Harga surplus paling rendah Rp100/kg."],
    [{ harga_surplus: 1000001 }, "Harga surplus paling tinggi Rp1.000.000/kg."],
    [{ harga_surplus: "52000" }, "Harga surplus harus berupa angka."],
    [{}, "Harga surplus harus berupa angka."],
  ])("menolak %j", (body, pesan) => {
    expect(pesanGagal(SkemaSurplus, body)).toBe(pesan);
  });
});

describe("SkemaTandaiNotifikasi", () => {
  it("tanpa ids berarti tandai semua", () => {
    expect(SkemaTandaiNotifikasi.parse({})).toEqual({});
    expect(SkemaTandaiNotifikasi.parse({ ids: [ID] })).toEqual({ ids: [ID] });
  });

  it("menolak daftar kosong, ID rusak, dan lebih dari 200", () => {
    expect(pesanGagal(SkemaTandaiNotifikasi, { ids: [] })).toBe("ids tidak boleh kosong.");
    expect(pesanGagal(SkemaTandaiNotifikasi, { ids: ["x"] })).toBe("ID tidak valid.");
    expect(pesanGagal(SkemaTandaiNotifikasi, { ids: "semua" })).toBe("ids harus berupa daftar ID.");
    expect(pesanGagal(SkemaTandaiNotifikasi, { ids: Array(201).fill(ID) })).toBe(
      "Paling banyak 200 notifikasi sekali kirim.",
    );
  });
});

describe("SkemaMasuk", () => {
  it("merapikan email", () => {
    expect(SkemaMasuk.parse({ email: "  Penjual.Demo@Example.com ", password: "rahasia" })).toEqual({
      email: "penjual.demo@example.com",
      password: "rahasia",
    });
  });

  it("kata sandi tidak dipangkas", () => {
    expect(SkemaMasuk.parse({ email: "a@b.co", password: "  spasi  " }).password).toBe("  spasi  ");
  });

  it.each([
    [{ password: "x" }, "Email wajib diisi."],
    [{ email: "bukan-email", password: "x" }, "Format email tidak valid."],
    [{ email: "a@b.co" }, "Kata sandi wajib diisi."],
    [{ email: "a@b.co", password: "" }, "Kata sandi wajib diisi."],
    [{ email: "a@b.co", password: "x".repeat(73) }, "Kata sandi paling panjang 72 karakter."],
  ])("menolak %j", (body, pesan) => {
    expect(pesanGagal(SkemaMasuk, body)).toBe(pesan);
  });
});

describe("SkemaDaftar", () => {
  const sah = {
    email: "Warung.Siti@Example.com",
    password: "rahasia-123",
    peran: "pembeli",
    nama: "  Siti Nurhaliza ",
    nama_usaha: " Warung Nasi Teh Siti ",
    kecamatan_id: 3273240,
    no_hp: "0812-0000-0201",
  };

  it("merapikan data dan mengubah nomor HP ke format wa.me", () => {
    expect(SkemaDaftar.parse(sah)).toEqual({
      email: "warung.siti@example.com",
      password: "rahasia-123",
      peran: "pembeli",
      nama: "Siti Nurhaliza",
      nama_usaha: "Warung Nasi Teh Siti",
      kecamatan_id: 3273240,
      no_hp: "6281200000201",
    });
  });

  it("nama usaha boleh kosong", () => {
    expect(SkemaDaftar.parse({ ...sah, nama_usaha: "   " }).nama_usaha).toBeNull();
    expect(SkemaDaftar.parse({ ...sah, nama_usaha: null }).nama_usaha).toBeNull();
    const { nama_usaha: _dibuang, ...tanpaUsaha } = sah;
    void _dibuang;
    expect(SkemaDaftar.parse(tanpaUsaha).nama_usaha).toBeUndefined();
  });

  it.each([
    [{ password: "pendek" }, "Kata sandi paling sedikit 8 karakter."],
    [{ peran: "admin" }, "Pilih peran: penjual atau pembeli."],
    [{ peran: undefined }, "Pilih peran: penjual atau pembeli."],
    [{ nama: " A " }, "Nama paling sedikit 2 huruf."],
    [{ nama: "x".repeat(81) }, "Nama paling panjang 80 karakter."],
    [{ nama_usaha: "x".repeat(121) }, "Nama usaha paling panjang 120 karakter."],
    [{ kecamatan_id: undefined }, "Pilih kecamatan."],
    [{ kecamatan_id: "3273240" }, "Pilih kecamatan."],
    [{ kecamatan_id: 1.5 }, "Kecamatan tidak dikenal."],
    [{ no_hp: "12345" }, "Nomor HP tidak valid. Contoh: 081234567890."],
    [{ no_hp: undefined }, "Nomor HP wajib diisi."],
    [{ email: "salah" }, "Format email tidak valid."],
  ])("menolak %j", (ubah, pesan) => {
    expect(pesanGagal(SkemaDaftar, { ...sah, ...ubah })).toBe(pesan);
  });
});

describe("SkemaUbahProfil", () => {
  it("menerima sebagian kolom", () => {
    expect(SkemaUbahProfil.parse({ nama: " Bu Siti " })).toEqual({ nama: "Bu Siti" });
    expect(SkemaUbahProfil.parse({ no_hp: "+62 813 1111 2222" })).toEqual({ no_hp: "6281311112222" });
    expect(SkemaUbahProfil.parse({ nama_usaha: null })).toEqual({ nama_usaha: null });
    expect(SkemaUbahProfil.parse({ kecamatan_id: 3273260 })).toEqual({ kecamatan_id: 3273260 });
  });

  it("menolak body kosong dan nomor HP rusak", () => {
    expect(pesanGagal(SkemaUbahProfil, {})).toBe("Tidak ada data yang diubah.");
    expect(pesanGagal(SkemaUbahProfil, { no_hp: "abc" })).toBe("Nomor HP tidak valid. Contoh: 081234567890.");
  });

  it("membuang kolom yang tidak boleh diubah (peran, id)", () => {
    const hasil = SkemaUbahProfil.parse({ nama: "Siti", peran: "penjual", id: ID });
    expect(hasil).toEqual({ nama: "Siti" });
  });
});
