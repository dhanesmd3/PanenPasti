import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { bacaBody, bilanganQuery, dariGalatDb, galat, idValid } from "./api";
import { cekBatasDaftar, cekBatasMasuk, BATAS_DAFTAR_PER_IP, BATAS_MASUK_PER_AKUN } from "./batas-auth";
import { dariGalatAuth } from "./galat-auth";
import { resetBatas } from "./rate-limit";

const isi = async (r: Response) => (await r.json()) as { error: string; kode?: string };

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("galat", () => {
  it("membentuk { error } dengan status dan kode opsional", async () => {
    const tanpaKode = galat("Masuk terlebih dahulu.", 401);
    expect(tanpaKode.status).toBe(401);
    expect(await isi(tanpaKode)).toEqual({ error: "Masuk terlebih dahulu." });

    const denganKode = galat("Stok tidak cukup.", 409, "PP409", { "retry-after": "1" });
    expect(await isi(denganKode)).toEqual({ error: "Stok tidak cukup.", kode: "PP409" });
    expect(denganKode.headers.get("retry-after")).toBe("1");
  });
});

describe("dariGalatDb", () => {
  it.each([
    ["PP401", 401],
    ["PP403", 403],
    ["PP404", 404],
    ["PP409", 409],
    ["PP422", 422],
  ])("galat bisnis %s diteruskan sebagai HTTP %i dengan pesan aslinya", async (kode, status) => {
    const r = dariGalatDb({ code: kode, message: "Stok tidak cukup. Sisa stok 40 kg." }, "uji");
    expect(r.status).toBe(status);
    expect(await isi(r)).toEqual({ error: "Stok tidak cukup. Sisa stok 40 kg.", kode });
  });

  it.each([
    ["22P02", 400],
    ["23514", 422],
    ["23503", 409],
    ["23505", 409],
    ["42501", 403],
    ["PGRST116", 404],
    ["PGRST301", 401],
    ["40P01", 503],
  ])("galat Postgres %s menjadi HTTP %i tanpa membocorkan pesan asli", async (kode, status) => {
    const r = dariGalatDb({ code: kode, message: 'relation "public.orders" rahasia internal' }, "uji");
    expect(r.status).toBe(status);
    const body = await isi(r);
    expect(body.error).not.toContain("rahasia");
    expect(body.kode).toBe(kode);
  });

  it("galat tak dikenal menjadi 500 generik dan dicatat di log", async () => {
    const r = dariGalatDb({ code: "XX000", message: "detail internal" }, "POST /api/orders");
    expect(r.status).toBe(500);
    expect(await isi(r)).toEqual({ error: "Terjadi kesalahan di server. Coba lagi sebentar." });
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("POST /api/orders"));
  });

  it("kode yang hanya mirip PPxxx tidak dianggap galat bisnis", () => {
    expect(dariGalatDb({ code: "PP999", message: "x" }, "uji").status).toBe(500);
    expect(dariGalatDb({ code: "PP40", message: "x" }, "uji").status).toBe(500);
    expect(dariGalatDb({ code: null, message: null }, "uji").status).toBe(500);
  });
});

describe("bacaBody", () => {
  const skema = z.object({ jumlah: z.number("Jumlah harus angka.") });
  const permintaan = (body: string) =>
    new Request("http://localhost/api/uji", { method: "POST", body });

  it("mengembalikan data yang lolos validasi", async () => {
    const hasil = await bacaBody(permintaan('{"jumlah": 5}'), skema);
    expect(hasil).toEqual({ ok: true, data: { jumlah: 5 } });
  });

  it("body bukan JSON → 400", async () => {
    const hasil = await bacaBody(permintaan("bukan json"), skema);
    expect(hasil.ok).toBe(false);
    if (hasil.ok) return;
    expect(hasil.respons.status).toBe(400);
    expect(await isi(hasil.respons)).toEqual({ error: "Body permintaan harus berupa JSON." });
  });

  it("body kosong → 400", async () => {
    const hasil = await bacaBody(new Request("http://localhost/api/uji", { method: "POST" }), skema);
    expect(hasil.ok).toBe(false);
  });

  it("gagal validasi → 400 dengan pesan dari skema", async () => {
    const hasil = await bacaBody(permintaan('{"jumlah": "lima"}'), skema);
    expect(hasil.ok).toBe(false);
    if (hasil.ok) return;
    expect(hasil.respons.status).toBe(400);
    expect(await isi(hasil.respons)).toEqual({ error: "Jumlah harus angka." });
  });
});

describe("idValid dan bilanganQuery", () => {
  it("idValid hanya menerima bentuk UUID", () => {
    expect(idValid("22222222-2222-4222-8222-222222222222")).toBe(true);
    expect(idValid("22222222-2222-4222-8222-22222222222")).toBe(false);
    expect(idValid("abc")).toBe(false);
    expect(idValid("22222222-2222-4222-8222-222222222222; drop table orders")).toBe(false);
  });

  it("bilanganQuery menjepit ke batas dan memakai nilai bawaan untuk masukan rusak", () => {
    expect(bilanganQuery(null, 50, 1, 100)).toBe(50);
    expect(bilanganQuery("", 50, 1, 100)).toBe(50);
    expect(bilanganQuery("abc", 50, 1, 100)).toBe(50);
    expect(bilanganQuery("2.5", 50, 1, 100)).toBe(50);
    expect(bilanganQuery("20", 50, 1, 100)).toBe(20);
    expect(bilanganQuery("0", 50, 1, 100)).toBe(1);
    expect(bilanganQuery("100000", 50, 1, 100)).toBe(100);
  });
});

describe("dariGalatAuth", () => {
  it.each([
    ["invalid_credentials", 401, "Email atau kata sandi salah."],
    ["user_already_exists", 409, "Email sudah terdaftar. Silakan masuk."],
    ["email_not_confirmed", 403, "Email belum dikonfirmasi. Buka tautan di email pendaftaran Anda."],
    ["over_request_rate_limit", 429, "Terlalu banyak percobaan. Coba lagi beberapa menit lagi."],
  ])("%s → %i", async (code, status, pesan) => {
    const r = dariGalatAuth({ code, status: 400, message: "pesan bahasa Inggris" }, "uji");
    expect(r.status).toBe(status);
    expect((await isi(r)).error).toBe(pesan);
  });

  it("login gagal tidak membedakan email salah dan kata sandi salah", async () => {
    const r = dariGalatAuth({ code: "invalid_credentials", status: 400 }, "uji");
    expect((await isi(r)).error).toBe("Email atau kata sandi salah.");
  });

  it("galat tak dikenal → 502 generik, status 429 tanpa kode tetap 429", async () => {
    const r = dariGalatAuth({ code: "unexpected_failure", status: 500, message: "Database error saving new user" }, "uji");
    expect(r.status).toBe(502);
    expect((await isi(r)).error).not.toContain("Database");
    expect(dariGalatAuth({ status: 429 }, "uji").status).toBe(429);
  });
});

describe("rate limit login dan pendaftaran", () => {
  const dari = (ip: string) => new Headers({ "x-forwarded-for": ip });

  beforeEach(() => resetBatas());

  it("membatasi percobaan login per akun, tanpa mengunci akun lain di IP yang sama", async () => {
    for (let i = 0; i < BATAS_MASUK_PER_AKUN; i++) {
      expect(cekBatasMasuk(dari("10.0.0.1"), "a@uji.test")).toBeNull();
    }
    const ditolak = cekBatasMasuk(dari("10.0.0.1"), "a@uji.test");
    expect(ditolak?.status).toBe(429);
    expect(Number(ditolak?.headers.get("retry-after"))).toBeGreaterThan(0);
    expect((await isi(ditolak!)).error).toMatch(/Coba lagi dalam \d+ menit/);

    expect(cekBatasMasuk(dari("10.0.0.1"), "b@uji.test")).toBeNull();
    expect(cekBatasMasuk(dari("10.0.0.2"), "a@uji.test")).toBeNull();
  });

  it("membatasi pendaftaran per IP", () => {
    for (let i = 0; i < BATAS_DAFTAR_PER_IP; i++) {
      expect(cekBatasDaftar(dari("10.0.0.3"))).toBeNull();
    }
    expect(cekBatasDaftar(dari("10.0.0.3"))?.status).toBe(429);
    expect(cekBatasDaftar(dari("10.0.0.4"))).toBeNull();
  });
});
