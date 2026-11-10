// Data statis yang ikut di repo (folder data/), dibaca di server.
// File-file ini didaftarkan di next.config.ts (outputFileTracingIncludes)
// agar ikut ter-deploy ke Vercel.

import { readFileSync } from "node:fs";
import path from "node:path";
import type { Kecamatan } from "@/types";
import { bacaCsvHarga, type BarisHarga } from "../harga-csv";

const lokasiData = (...bagian: string[]) =>
  path.join(process.cwd(), "data", ...bagian);

export const SUMBER_HARGA =
  "PIHPS Nasional, Bank Indonesia (bi.go.id/hargapangan), diolah PanenPasti";

let cacheKecamatan: Map<number, Kecamatan> | null = null;
let cacheHarga: BarisHarga[] | null = null;

export function semuaKecamatan(): Map<number, Kecamatan> {
  if (cacheKecamatan) return cacheKecamatan;
  const baris = readFileSync(lokasiData("kecamatan.csv"), "utf-8").trim().split(/\r?\n/);
  if (baris.shift() !== "id,nama,kab_kota,lat,lng,wikidata") {
    throw new Error("Header data/kecamatan.csv tidak dikenali");
  }
  cacheKecamatan = new Map(
    baris.map((b) => {
      const [id, nama, kab_kota, lat, lng] = b.split(",");
      const k: Kecamatan = {
        id: Number(id),
        nama,
        kab_kota: kab_kota as Kecamatan["kab_kota"],
        lat: Number(lat),
        lng: Number(lng),
      };
      return [k.id, k];
    }),
  );
  return cacheKecamatan;
}

export function cariKecamatan(id: number): Kecamatan | undefined {
  return semuaKecamatan().get(id);
}

export function dataHarga(): BarisHarga[] {
  cacheHarga ??= bacaCsvHarga(
    readFileSync(lokasiData("harga", "cabai_rawit_merah_pihps.csv"), "utf-8"),
  );
  return cacheHarga;
}
