import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DAFTAR_KOMODITAS, komoditasDariId } from "./komoditas";

// Daftar komoditas ditulis di tiga tempat (kode, migrasi SQL, data seed).
// Uji ini memastikan ketiganya tidak berbeda.

function komoditasDiMigrasi(): Map<number, string> {
  const hasil = new Map<number, string>();
  const folder = "supabase/migrations";
  for (const berkas of readdirSync(folder).sort()) {
    const sql = readFileSync(`${folder}/${berkas}`, "utf-8");
    for (const blok of sql.matchAll(/insert into public\.komoditas[\s\S]*?on conflict/g)) {
      for (const [, id, nama] of blok[0].matchAll(/\((\d+),\s*'([^']+)'/g)) hasil.set(Number(id), nama);
    }
  }
  return hasil;
}

interface ListingSeed {
  komoditas_id?: number;
  harga_per_kg: number;
}
const seed = JSON.parse(readFileSync("data/seed/simulasi.json", "utf-8")) as {
  komoditas: { id: number; nama: string }[];
  penjual: { listing: ListingSeed[] }[];
};

describe("daftar komoditas", () => {
  const harapan = new Map(DAFTAR_KOMODITAS.map((k) => [k.id, k.nama]));

  it("sama dengan isi migrasi", () => {
    expect(komoditasDiMigrasi()).toEqual(harapan);
  });

  it("sama dengan data seed", () => {
    expect(new Map(seed.komoditas.map((k) => [k.id, k.nama]))).toEqual(harapan);
  });

  it("id dan kode unik", () => {
    expect(new Set(DAFTAR_KOMODITAS.map((k) => k.id)).size).toBe(DAFTAR_KOMODITAS.length);
    expect(new Set(DAFTAR_KOMODITAS.map((k) => k.kode)).size).toBe(DAFTAR_KOMODITAS.length);
  });

  it("listing seed memakai komoditas yang ada dan harga dalam rentang wajar", () => {
    const listing = seed.penjual.flatMap((p) => p.listing);
    for (const l of listing) {
      const k = komoditasDariId(l.komoditas_id ?? 1);
      expect(k, `komoditas_id ${l.komoditas_id}`).toBeDefined();
      expect(l.harga_per_kg).toBeGreaterThanOrEqual(k!.harga[0]);
      expect(l.harga_per_kg).toBeLessThanOrEqual(k!.harga[1]);
    }
    // Setiap komoditas muncul minimal sekali di katalog demo.
    const terpakai = new Set(listing.map((l) => l.komoditas_id ?? 1));
    expect([...terpakai].sort()).toEqual(DAFTAR_KOMODITAS.map((k) => k.id));
  });
});
