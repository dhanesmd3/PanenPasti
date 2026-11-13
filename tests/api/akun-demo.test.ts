import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetBatas } from "@/lib/rate-limit";
import { buatSupabaseTiruan, ID, permintaan, type SupabaseTiruan } from "./bantuan";

const keadaan = vi.hoisted(() => ({ supabase: null as unknown }));

vi.mock("@/lib/supabase/server", () => ({
  supabaseTerkonfigurasi: () => true,
  buatSupabaseServer: async () => keadaan.supabase,
}));

import * as demo from "@/app/api/auth/demo/route";

let sb: SupabaseTiruan;
const kirim = (body: unknown) => demo.POST(permintaan("POST", "/api/auth/demo", body));

beforeEach(() => {
  sb = buatSupabaseTiruan();
  keadaan.supabase = sb.klien;
  resetBatas();
  vi.stubEnv("DEMO_PASSWORD", "sandi-demo-123");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/auth/demo", () => {
  it("masuk ke akun demo sesuai peran dengan kata sandi dari server", async () => {
    sb.auth.signInWithPassword.mockResolvedValue({ data: { user: { id: ID.penjual }, session: {} }, error: null });
    sb.jawabTabel("profiles", { data: { peran: "penjual" }, error: null });

    const r = await kirim({ peran: "penjual", lanjut: "/penjual/panen" });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true, peran: "penjual", lanjut: "/penjual/panen" });
    expect(sb.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "penjual.demo@example.com",
      password: "sandi-demo-123",
    });
  });

  it("tidak aktif tanpa DEMO_PASSWORD", async () => {
    vi.stubEnv("DEMO_PASSWORD", "");
    const r = await kirim({ peran: "pembeli" });
    expect(r.status).toBe(404);
    expect(sb.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("akun demo belum dibuat dijawab 503, bukan 401", async () => {
    sb.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: "invalid_credentials", status: 400, message: "Invalid login credentials" },
    });
    const r = await kirim({ peran: "pembeli" });
    expect(r.status).toBe(503);
  });

  it("profil dengan peran lain ditolak dan sesinya dilepas", async () => {
    sb.auth.signInWithPassword.mockResolvedValue({ data: { user: { id: ID.pembeli }, session: {} }, error: null });
    sb.jawabTabel("profiles", { data: { peran: "penjual" }, error: null });
    const r = await kirim({ peran: "pembeli" });
    expect(r.status).toBe(503);
    expect(sb.auth.signOut).toHaveBeenCalled();
  });

  it("peran tidak dikenal ditolak 400", async () => {
    const r = await kirim({ peran: "admin" });
    expect(r.status).toBe(400);
  });
});
