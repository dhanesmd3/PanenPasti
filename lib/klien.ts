// Perkakas data untuk komponen "use client": fetch JSON ke API sendiri,
// hook pemuat dengan status loading/error, dan tabel referensi (kecamatan, komoditas).

import { useCallback, useEffect, useState } from "react";
import type { Kecamatan, Komoditas, Peran } from "@/types";
import { buatSupabaseBrowser } from "./supabase/client";

/**
 * fetch + parse JSON. Gagal → lempar Error berisi kalimat yang bisa ditampilkan:
 * endpoint A memakai `error`, endpoint AI memakai `pesan`.
 */
export async function ambilJson<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: init?.body ? { "content-type": "application/json", ...init.headers } : init?.headers,
    });
  } catch {
    throw new Error("Tidak ada koneksi internet. Periksa jaringan lalu coba lagi.");
  }
  const isi = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(isi?.error ?? isi?.pesan ?? "Terjadi kesalahan. Coba lagi sebentar.");
  }
  return isi as T;
}

export interface Muatan<T> {
  data: T | null;
  galat: string | null;
  memuat: boolean;
  muatUlang: () => void;
}

/** Jalankan `muat` saat komponen tampil dan setiap `muatUlang()` dipanggil. */
export function useMuat<T>(muat: () => Promise<T>, kunci: readonly unknown[] = []): Muatan<T> {
  const [data, setData] = useState<T | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [putaran, setPutaran] = useState(0);

  useEffect(() => {
    let batal = false;
    Promise.resolve()
      .then(() => {
        if (batal) return;
        setMemuat(true);
        setGalat(null);
        return muat();
      })
      .then(
        (hasil) => {
          if (batal || hasil === undefined) return;
          setData(hasil);
          setMemuat(false);
        },
        (e: unknown) => {
          if (batal) return;
          setGalat(e instanceof Error ? e.message : "Terjadi kesalahan.");
          setMemuat(false);
        },
      );
    return () => {
      batal = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `muat` dibuat ulang tiap render; pemicunya `kunci`.
  }, [putaran, ...kunci]);

  const muatUlang = useCallback(() => setPutaran((n) => n + 1), []);
  return { data, galat, memuat, muatUlang };
}

/** Pesan galat Supabase client: kode PPxxx sudah berupa kalimat Indonesia. */
export function pesanSupabase(e: { code?: string; message?: string } | null): string {
  if (e?.code?.startsWith("PP") && e.message) return e.message;
  return "Gagal memuat data. Coba lagi sebentar.";
}

/** Tabel referensi (bisa dibaca tanpa login), di-cache per tab. */
function referensi<T extends { id: number }>(tabel: string, kolom: string): () => Promise<Map<number, T>> {
  let cache: Promise<Map<number, T>> | null = null;
  return () =>
    (cache ??= Promise.resolve()
      .then(() => buatSupabaseBrowser().from(tabel).select(kolom).order("nama"))
      .then(({ data, error }) => {
        if (error) throw new Error(pesanSupabase(error));
        return new Map((data as unknown as T[]).map((baris) => [baris.id, baris]));
      })
      .catch((e: unknown) => {
        cache = null;
        throw e;
      }));
}

export const ambilKecamatan = referensi<Kecamatan>("kecamatan", "id, nama, kab_kota, lat, lng");
export const ambilKomoditas = referensi<Komoditas>("komoditas", "id, nama, satuan");

export function useKecamatan(): Map<number, Kecamatan> {
  const { data } = useMuat(ambilKecamatan);
  return data ?? new Map();
}

export function useKomoditas(): Map<number, Komoditas> {
  const { data } = useMuat(ambilKomoditas);
  return data ?? new Map();
}

/** Nama komoditas dari tabel referensi; "Hasil panen" selama belum termuat. */
export function useNamaKomoditas(id: number): string {
  return useKomoditas().get(id)?.nama ?? "Hasil panen";
}

/**
 * Peran pengguna yang login, untuk tautan di halaman bersama (mis. /notifikasi).
 * Dibaca di browser karena halaman itu diprerender statis (cacheComponents).
 */
export async function ambilPeranSaya(): Promise<Peran | null> {
  const supabase = buatSupabaseBrowser();
  const { data: sesi } = await supabase.auth.getSession();
  const id = sesi.session?.user.id;
  if (!id) return null;
  const { data } = await supabase.from("profiles").select("peran").eq("id", id).maybeSingle();
  return data?.peran === "penjual" || data?.peran === "pembeli" ? data.peran : null;
}

export function usePeranSaya(): Peran | null {
  return useMuat(ambilPeranSaya).data;
}
