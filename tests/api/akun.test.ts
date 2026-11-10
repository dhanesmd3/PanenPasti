import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BATAS_MASUK_PER_AKUN } from "@/lib/batas-auth";
import { resetBatas } from "@/lib/rate-limit";
import { buatSupabaseTiruan, ID, permintaan, type SupabaseTiruan } from "./bantuan";

const keadaan = vi.hoisted(() => ({
  terkonfigurasi: true,
  supabase: null as unknown,
  sesi: null as null | { supabase: unknown; userId: string; email: string | null },
}));

vi.mock("@/lib/supabase/server", () => ({
  supabaseTerkonfigurasi: () => keadaan.terkonfigurasi,
  buatSupabaseServer: async () => keadaan.supabase,
  sesiOpsional: async () => keadaan.sesi,
  idPenggunaOpsional: async () => keadaan.sesi?.userId ?? null,
}));

import * as daftar from "@/app/api/auth/daftar/route";
import * as keluar from "@/app/api/auth/keluar/route";
import * as masuk from "@/app/api/auth/masuk/route";
import * as profil from "@/app/api/profil/route";

let sb: SupabaseTiruan;

const dataDaftar = {
  email: "Warung.Siti@Example.com",
  password: "rahasia-123",
  peran: "pembeli",
  nama: " Siti Nurhaliza ",
  nama_usaha: "Warung Nasi Teh Siti",
  kecamatan_id: 3273240,
  no_hp: "0812-0000-0201",
};

const barisProfil = {
  id: ID.pembeli,
  peran: "pembeli",
  nama: "Siti Nurhaliza",
  nama_usaha: "Warung Nasi Teh Siti",
  kecamatan_id: 3273240,
  no_hp: "6281200000201",
  dibuat_pada: "2026-11-10T03:00:00+00:00",
  diubah_pada: "2026-11-10T03:00:00+00:00",
};

beforeEach(() => {
  sb = buatSupabaseTiruan();
  keadaan.terkonfigurasi = true;
  keadaan.supabase = sb.klien;
  keadaan.sesi = null;
  resetBatas();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/auth/daftar", () => {
  it("mendaftarkan akun dengan metadata profil yang sudah dirapikan", async () => {
    sb.auth.signUp.mockResolvedValue({
      data: { user: { id: ID.pembeli, identities: [{ id: "x" }] }, session: { access_token: "t" } },
      error: null,
    });

    const r = await daftar.POST(permintaan("POST", "/api/auth/daftar", dataDaftar));
    expect(r.status).toBe(201);
    expect(await r.json()).toEqual({
      ok: true,
      peran: "pembeli",
      perlu_konfirmasi_email: false,
      lanjut: "/pembeli",
    });
    expect(sb.auth.signUp).toHaveBeenCalledWith({
      email: "warung.siti@example.com",
      password: "rahasia-123",
      options: {
        data: {
          peran: "pembeli",
          nama: "Siti Nurhaliza",
          nama_usaha: "Warung Nasi Teh Siti",
          kecamatan_id: 3273240,
          no_hp: "6281200000201",
        },
      },
    });
  });

  it("memberi tahu jika email masih perlu dikonfirmasi", async () => {
    sb.auth.signUp.mockResolvedValue({
      data: { user: { id: ID.pembeli, identities: [{ id: "x" }] }, session: null },
      error: null,
    });
    const r = await daftar.POST(permintaan("POST", "/api/auth/daftar", { ...dataDaftar, peran: "penjual", kecamatan_id: 3205120 }));
    expect(await r.json()).toMatchObject({ perlu_konfirmasi_email: true, lanjut: "/penjual" });
  });

  it("email yang sudah terdaftar dijawab 409, dalam dua bentuk jawaban Supabase", async () => {
    sb.auth.signUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { code: "user_already_exists", status: 422, message: "User already registered" },
    });
    let r = await daftar.POST(permintaan("POST", "/api/auth/daftar", dataDaftar));
    expect(r.status).toBe(409);

    sb.auth.signUp.mockResolvedValueOnce({ data: { user: { id: "x", identities: [] }, session: null }, error: null });
    r = await daftar.POST(permintaan("POST", "/api/auth/daftar", dataDaftar));
    expect(r.status).toBe(409);
    expect((await r.json()).error).toBe("Email sudah terdaftar. Silakan masuk.");
  });

  it("kecamatan di luar Garut dan Kota Bandung ditolak sebelum memanggil Supabase", async () => {
    const r = await daftar.POST(permintaan("POST", "/api/auth/daftar", { ...dataDaftar, kecamatan_id: 1234567 }));
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ error: "Kecamatan tidak dikenal." });
    expect(sb.auth.signUp).not.toHaveBeenCalled();
  });

  it.each([
    [{ password: "pendek" }, "Kata sandi paling sedikit 8 karakter."],
    [{ peran: "admin" }, "Pilih peran: penjual atau pembeli."],
    [{ no_hp: "123" }, "Nomor HP tidak valid. Contoh: 081234567890."],
  ])("data %j ditolak 400", async (ubah, pesan) => {
    const r = await daftar.POST(permintaan("POST", "/api/auth/daftar", { ...dataDaftar, ...ubah }));
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ error: pesan });
    expect(sb.auth.signUp).not.toHaveBeenCalled();
  });

  it("503 jika Supabase belum dikonfigurasi", async () => {
    keadaan.terkonfigurasi = false;
    const r = await daftar.POST(permintaan("POST", "/api/auth/daftar", dataDaftar));
    expect(r.status).toBe(503);
  });
});

describe("POST /api/auth/masuk", () => {
  const berhasil = () =>
    sb.auth.signInWithPassword.mockResolvedValue({ data: { user: { id: ID.pembeli }, session: {} }, error: null });

  it("login berhasil mengembalikan peran dan beranda", async () => {
    berhasil();
    sb.jawabTabel("profiles", { data: { peran: "pembeli" }, error: null });

    const r = await masuk.POST(permintaan("POST", "/api/auth/masuk", { email: " Siti@Example.com ", password: "rahasia-123" }));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true, peran: "pembeli", lanjut: "/pembeli" });
    expect(sb.auth.signInWithPassword).toHaveBeenCalledWith({ email: "siti@example.com", password: "rahasia-123" });
  });

  it("lanjut diterima hanya jika sesuai peran dan berada di dalam aplikasi", async () => {
    berhasil();
    const coba = async (lanjut: string) => {
      sb.jawabTabel("profiles", { data: { peran: "pembeli" }, error: null });
      const r = await masuk.POST(
        permintaan("POST", "/api/auth/masuk", { email: "siti@example.com", password: "rahasia-123", lanjut }),
      );
      return (await r.json()).lanjut;
    };
    expect(await coba("/pembeli/pesanan")).toBe("/pembeli/pesanan");
    expect(await coba("/penjual/panen")).toBe("/pembeli");
    expect(await coba("https://jahat.example")).toBe("/pembeli");
    expect(await coba("//jahat.example")).toBe("/pembeli");
  });

  it("email atau kata sandi salah dijawab 401 dengan pesan yang sama", async () => {
    sb.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: "invalid_credentials", status: 400, message: "Invalid login credentials" },
    });
    const r = await masuk.POST(permintaan("POST", "/api/auth/masuk", { email: "siti@example.com", password: "salah" }));
    expect(r.status).toBe(401);
    expect(await r.json()).toEqual({ error: "Email atau kata sandi salah.", kode: "invalid_credentials" });
  });

  it("percobaan ke-11 untuk akun yang sama dari IP yang sama ditolak 429", async () => {
    sb.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: "invalid_credentials", status: 400, message: "Invalid login credentials" },
    });
    const coba = () =>
      masuk.POST(
        permintaan("POST", "/api/auth/masuk", { email: "siti@example.com", password: "tebak" }, { "x-forwarded-for": "10.1.1.1" }),
      );
    for (let i = 0; i < BATAS_MASUK_PER_AKUN; i++) expect((await coba()).status).toBe(401);

    const r = await coba();
    expect(r.status).toBe(429);
    expect(Number(r.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(sb.auth.signInWithPassword).toHaveBeenCalledTimes(BATAS_MASUK_PER_AKUN);
  });

  it("body tidak valid ditolak 400 dan tidak menghabiskan jatah percobaan", async () => {
    const r = await masuk.POST(permintaan("POST", "/api/auth/masuk", { email: "bukan-email", password: "x" }));
    expect(r.status).toBe(400);
    expect(sb.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("akun tanpa profil tetap bisa login, diarahkan ke halaman depan", async () => {
    berhasil();
    sb.jawabTabel("profiles", { data: null, error: null });
    const r = await masuk.POST(permintaan("POST", "/api/auth/masuk", { email: "siti@example.com", password: "rahasia-123" }));
    expect(await r.json()).toEqual({ ok: true, peran: null, lanjut: "/" });
  });
});

describe("POST /api/auth/keluar", () => {
  it("mengakhiri sesi di perangkat ini", async () => {
    const r = await keluar.POST();
    expect(await r.json()).toEqual({ ok: true });
    expect(sb.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("tetap menjawab ok walau Supabase mengembalikan galat", async () => {
    sb.auth.signOut.mockResolvedValueOnce({ error: { code: "session_not_found", message: "x" } } as never);
    const r = await keluar.POST();
    expect(r.status).toBe(200);
  });
});

describe("/api/profil", () => {
  beforeEach(() => {
    keadaan.sesi = { supabase: sb.klien, userId: ID.pembeli, email: "siti@example.com" };
  });

  it("GET mengembalikan profil sendiri beserta nomor HP dan email", async () => {
    sb.jawabRpc("profil_saya", { data: [barisProfil], error: null });
    const r = await profil.GET();
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({
      id: ID.pembeli,
      peran: "pembeli",
      nama: "Siti Nurhaliza",
      nama_usaha: "Warung Nasi Teh Siti",
      kecamatan_id: 3273240,
      no_hp: "6281200000201",
      email: "siti@example.com",
    });
  });

  it("GET tanpa login 401, tanpa baris profil 404", async () => {
    sb.jawabRpc("profil_saya", { data: [], error: null });
    expect((await profil.GET()).status).toBe(404);
    keadaan.sesi = null;
    expect((await profil.GET()).status).toBe(401);
  });

  it("PATCH hanya mengirim kolom yang boleh diubah, untuk baris milik sendiri", async () => {
    sb.jawabTabel("profiles", { data: [{ id: ID.pembeli }], error: null });
    sb.jawabRpc("profil_saya", { data: [{ ...barisProfil, nama: "Bu Siti", no_hp: "6281311112222" }], error: null });

    const r = await profil.PATCH(
      permintaan("PATCH", "/api/profil", { nama: " Bu Siti ", no_hp: "0813 1111 2222", peran: "penjual", id: ID.penjual }),
    );
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ nama: "Bu Siti", no_hp: "6281311112222", peran: "pembeli" });

    const [ubah] = sb.kueriKe("profiles");
    expect(ubah.argumen("update")).toEqual([{ nama: "Bu Siti", no_hp: "6281311112222" }]);
    expect(ubah.argumen("eq")).toEqual(["id", ID.pembeli]);
  });

  it("PATCH bisa mengosongkan nama usaha", async () => {
    sb.jawabTabel("profiles", { data: [{ id: ID.pembeli }], error: null });
    sb.jawabRpc("profil_saya", { data: [{ ...barisProfil, nama_usaha: null }], error: null });
    await profil.PATCH(permintaan("PATCH", "/api/profil", { nama_usaha: "  " }));
    expect(sb.kueriKe("profiles")[0].argumen("update")).toEqual([{ nama_usaha: null }]);
  });

  it("PATCH menolak kecamatan tak dikenal dan body kosong", async () => {
    let r = await profil.PATCH(permintaan("PATCH", "/api/profil", { kecamatan_id: 1234567 }));
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ error: "Kecamatan tidak dikenal." });

    r = await profil.PATCH(permintaan("PATCH", "/api/profil", {}));
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ error: "Tidak ada data yang diubah." });
    expect(sb.from).not.toHaveBeenCalled();
  });
});
