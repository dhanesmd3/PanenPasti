// Aturan akses halaman per peran, dipakai proxy.ts.
// Sengaja tanpa impor dari next/* supaya bisa diuji sebagai fungsi biasa.
//
//   /penjual/*    hanya penjual
//   /pembeli/*    hanya pembeli
//   /notifikasi   siapa pun yang sudah login
//   /masuk, /daftar  hanya untuk yang belum login
//   lainnya       bebas (landing, tentang, /api/*)
//
// Proxy hanya mengatur arah navigasi. Perlindungan data yang sebenarnya ada di
// Row Level Security dan fungsi database, yang tetap menolak walau proxy dilewati.

import type { Peran } from "@/types";

export const BERANDA: Record<Peran, string> = {
  penjual: "/penjual",
  pembeli: "/pembeli",
};

export const HALAMAN_MASUK = "/masuk";

export type JenisRute = "penjual" | "pembeli" | "login" | "tamu" | "bebas";

function diBawah(pathname: string, awalan: string): boolean {
  return pathname === awalan || pathname.startsWith(`${awalan}/`);
}

export function jenisRute(pathname: string): JenisRute {
  if (diBawah(pathname, "/penjual")) return "penjual";
  if (diBawah(pathname, "/pembeli")) return "pembeli";
  if (diBawah(pathname, "/notifikasi")) return "login";
  if (diBawah(pathname, "/masuk") || diBawah(pathname, "/daftar")) return "tamu";
  return "bebas";
}

/** Proxy perlu membaca peran dari database hanya untuk jenis rute ini. */
export function perluPeran(jenis: JenisRute): boolean {
  return jenis === "penjual" || jenis === "pembeli" || jenis === "tamu";
}

export function adalahPeran(nilai: unknown): nilai is Peran {
  return nilai === "penjual" || nilai === "pembeli";
}

/**
 * Tujuan setelah login yang aman dipakai untuk redirect: harus path di dalam
 * aplikasi (bukan URL luar seperti "//evil.com") dan sesuai dengan peran.
 * Selain itu, kembali ke beranda peran tersebut.
 */
export function lanjutAman(nilai: string | null | undefined, peran: Peran): string {
  const beranda = BERANDA[peran];
  if (!nilai || !nilai.startsWith("/") || nilai.startsWith("//") || nilai.includes("\\")) {
    return beranda;
  }
  const pathname = nilai.split(/[?#]/)[0];
  const jenis = jenisRute(pathname);
  if (jenis === peran || jenis === "login") return nilai;
  return beranda;
}

export interface KeadaanAkses {
  pathname: string;
  /** Query string termasuk "?", atau string kosong. */
  search?: string;
  login: boolean;
  /** Peran dari tabel profiles. Null jika belum login atau profil belum ada. */
  peran: Peran | null;
}

/** Path tujuan redirect, atau null jika permintaan boleh lanjut. */
export function tujuanAlih({ pathname, search = "", login, peran }: KeadaanAkses): string | null {
  const jenis = jenisRute(pathname);
  if (jenis === "bebas") return null;

  if (!login) {
    if (jenis === "tamu") return null;
    return `${HALAMAN_MASUK}?lanjut=${encodeURIComponent(pathname + search)}`;
  }

  if (jenis === "login") return null;
  if (jenis === "tamu") return peran ? BERANDA[peran] : null;

  // Rute khusus peran.
  if (peran === jenis) return null;
  return peran ? BERANDA[peran] : "/";
}
