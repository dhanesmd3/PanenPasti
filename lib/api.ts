// Perkakas bersama untuk route handler milik A.
//
// Bentuk gagal selalu { error: string, kode?: string } (tipe GalatApi), dengan
// `error` berupa kalimat Indonesia yang boleh langsung ditampilkan ke pengguna.

import type { z } from "zod";
import type { GalatApi } from "@/types";
import { pesanValidasi } from "./skema-api";
import { sesiOpsional, supabaseTerkonfigurasi, type SesiServer } from "./supabase/server";

export type Hasil<T> = { ok: true; data: T } | { ok: false; respons: Response };

export function galat(
  pesan: string,
  status: number,
  kode?: string,
  headers?: Record<string, string>,
): Response {
  const isi: GalatApi = kode ? { error: pesan, kode } : { error: pesan };
  return Response.json(isi, { status, headers });
}

/** Baca body JSON lalu validasi dengan skema Zod. */
export async function bacaBody<S extends z.ZodType>(
  request: Request,
  skema: S,
): Promise<Hasil<z.output<S>>> {
  let mentah: unknown;
  try {
    mentah = await request.json();
  } catch {
    return { ok: false, respons: galat("Body permintaan harus berupa JSON.", 400) };
  }
  const hasil = skema.safeParse(mentah);
  if (!hasil.success) {
    return { ok: false, respons: galat(pesanValidasi(hasil.error), 400) };
  }
  return { ok: true, data: hasil.data };
}

/** Sesi wajib: 503 jika Supabase belum dikonfigurasi, 401 jika belum login. */
export async function sesiWajib(): Promise<Hasil<SesiServer>> {
  if (!supabaseTerkonfigurasi()) {
    return { ok: false, respons: galat("Database belum dikonfigurasi.", 503) };
  }
  const sesi = await sesiOpsional();
  if (!sesi) {
    return { ok: false, respons: galat("Masuk terlebih dahulu.", 401) };
  }
  return { ok: true, data: sesi };
}

const POLA_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Parameter [id] di URL harus berbentuk UUID; selain itu dianggap tidak ditemukan. */
export function idValid(id: string): boolean {
  return POLA_ID.test(id);
}

interface GalatDb {
  code?: string | null;
  message?: string | null;
}

/**
 * Ubah galat PostgREST/Postgres menjadi respons HTTP.
 *
 * Fungsi database PanenPasti melempar SQLSTATE 'PPxxx' dengan pesan Indonesia;
 * tiga digit terakhir adalah status HTTP (PP409 → 409). Galat lain dipetakan ke
 * pesan umum dan detailnya hanya dicatat di log server.
 */
export function dariGalatDb(e: GalatDb, konteks: string): Response {
  const kode = e.code ?? "";
  const cocok = /^PP([1-5]\d{2})$/.exec(kode);
  if (cocok) {
    return galat(e.message || "Permintaan tidak bisa diproses.", Number(cocok[1]), kode);
  }

  switch (kode) {
    case "22P02": // format uuid/angka salah
    case "22003": // angka di luar jangkauan
    case "22001": // teks terlalu panjang
      return galat("Data yang dikirim tidak valid.", 400, kode);
    case "23514": // check constraint
    case "23502": // not null
      return galat("Data yang dikirim tidak memenuhi aturan.", 422, kode);
    case "23503": // foreign key
      return galat("Data yang dirujuk tidak ditemukan.", 409, kode);
    case "23505": // unique
      return galat("Data yang sama sudah ada.", 409, kode);
    case "42501": // tidak punya hak / ditolak RLS
      return galat("Anda tidak punya akses untuk melakukan ini.", 403, kode);
    case "PGRST116": // .single() tidak menemukan baris
      return galat("Data tidak ditemukan.", 404, kode);
    case "PGRST301": // JWT kedaluwarsa atau tidak valid
    case "PGRST302":
    case "PGRST303":
      return galat("Sesi berakhir. Silakan masuk lagi.", 401, kode);
    case "40001": // serialization failure
    case "40P01": // deadlock
      return galat("Sistem sedang sibuk. Coba lagi sebentar.", 503, kode, { "retry-after": "1" });
  }

  console.error(`[${konteks}] ${kode || "tanpa kode"}: ${e.message ?? "galat tidak dikenal"}`);
  return galat("Terjadi kesalahan di server. Coba lagi sebentar.", 500);
}

/** Baca bilangan bulat dari query string dengan batas bawah/atas dan nilai bawaan. */
export function bilanganQuery(
  nilai: string | null,
  bawaan: number,
  min: number,
  maks: number,
): number {
  if (nilai == null || nilai.trim() === "") return bawaan;
  const n = Number(nilai);
  if (!Number.isInteger(n)) return bawaan;
  return Math.min(maks, Math.max(min, n));
}
