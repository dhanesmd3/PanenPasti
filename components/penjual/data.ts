// Akses data halaman penjual. Listing dibaca & diubah langsung lewat Supabase
// client (RLS: hanya pemilik yang bisa mengubah), sisanya lewat API milik A dan D.

import type { Listing, Prediksi, Profile } from "@/types";
import { ambilJson } from "@/lib/klien";
import { keListing } from "@/lib/pesanan";
import { buatSupabaseBrowser } from "@/lib/supabase/client";
import { hariIniWib } from "@/lib/tanggal";

export const KOLOM_PANEN =
  "id, penjual_id, komoditas_id, jumlah_kg, sisa_kg, kualitas, tgl_panen, harga_per_kg, foto_url, status, is_surplus, harga_surplus";

export const BUCKET_FOTO = "foto-listing";

/**
 * Kalimat galat yang bisa ditampilkan untuk operasi tulis.
 * Kode PPxxx dari trigger/fungsi database sudah berupa kalimat Indonesia.
 */
export function pesanGalatDb(
  e: { code?: string; message?: string } | null,
  cadangan = "Gagal menyimpan. Coba lagi sebentar.",
): string {
  if (e?.code?.startsWith("PP") && e.message) return e.message;
  if (e?.code === "23514") return "Isian belum sesuai aturan. Periksa jumlah, harga, dan tanggal.";
  if (e?.code === "42501") return "Anda tidak punya akses untuk mengubah panen ini.";
  return cadangan;
}

export async function idSaya(): Promise<string> {
  const { data } = await buatSupabaseBrowser().auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error("Sesi berakhir. Silakan masuk lagi.");
  return id;
}

/** Semua panen milik penjual yang login, panen terdekat dulu. */
export async function ambilPanenSaya(): Promise<Listing[]> {
  const id = await idSaya();
  const { data, error } = await buatSupabaseBrowser()
    .from("listings")
    .select(KOLOM_PANEN)
    .eq("penjual_id", id)
    .order("tgl_panen")
    .limit(200);
  if (error) throw new Error(pesanGalatDb(error, "Gagal memuat panen. Coba lagi sebentar."));
  return (data as unknown as Record<string, unknown>[]).map(keListing);
}

/** Satu panen milik sendiri, atau null kalau tidak ada / bukan milik pengguna. */
export async function ambilSatuPanen(listingId: string): Promise<Listing | null> {
  const id = await idSaya();
  const { data, error } = await buatSupabaseBrowser()
    .from("listings")
    .select(KOLOM_PANEN)
    .eq("id", listingId)
    .eq("penjual_id", id)
    .maybeSingle();
  // 22P02 = id di URL bukan UUID: anggap tidak ditemukan.
  if (error && error.code !== "22P02") throw new Error(pesanGalatDb(error, "Gagal memuat panen."));
  return data ? keListing(data as unknown as Record<string, unknown>) : null;
}

export type ProfilSaya = Profile & { email: string | null };

export function ambilProfilSaya(): Promise<ProfilSaya> {
  return ambilJson<ProfilSaya>("/api/profil");
}

export function ambilPrediksi(tglPanen?: string | null): Promise<Prediksi> {
  const q = new URLSearchParams({ komoditas_id: "1" });
  if (tglPanen) q.set("tgl_panen", tglPanen);
  return ambilJson<Prediksi>(`/api/harga/prediksi?${q}`);
}

export interface PenjelasanHarga {
  teks: string;
  dibuat_ai: boolean;
  label: string | null;
  disclaimer: string;
}

export function ambilPenjelasanHarga(tglPanen?: string | null): Promise<PenjelasanHarga> {
  return ambilJson<PenjelasanHarga>("/api/ai/penjelasan-harga", {
    method: "POST",
    body: JSON.stringify({ komoditas_id: 1, tgl_panen: tglPanen ?? null }),
  });
}

/** Panen yang masih bisa dipesan: belum habis dan tanggalnya belum lewat jauh. */
export function panenAktif(daftar: Listing[]): Listing[] {
  return daftar.filter((l) => l.status !== "habis" && l.sisa_kg > 0);
}

/** Tanggal panen terdekat yang belum lewat, untuk menyesuaikan saran harga. */
export function tglPanenTerdekat(daftar: Listing[]): string | null {
  const hariIni = hariIniWib();
  return panenAktif(daftar).find((l) => l.tgl_panen >= hariIni)?.tgl_panen ?? null;
}

export function sapaan(nama: string | undefined): string {
  const jam = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Jakarta" }).format(new Date()),
  );
  const waktu = jam < 11 ? "Selamat pagi" : jam < 15 ? "Selamat siang" : jam < 18 ? "Selamat sore" : "Selamat malam";
  if (!nama?.trim()) return waktu;
  // "Pak Darto Sumarna" → "Pak Darto", "Darto Sumarna" → "Darto".
  const kata = nama.trim().split(/\s+/);
  const panggilan = /^(pak|bu|bapak|ibu|kang|teh|mang|bi)$/i.test(kata[0]) ? kata.slice(0, 2).join(" ") : kata[0];
  return `${waktu}, ${panggilan}`;
}
