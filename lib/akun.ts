// Profil pengguna yang login, untuk menu akun dan halaman Profil (komponen "use client").

import { useEffect, useState } from "react";
import type { Profile } from "@/types";
import { ambilJson } from "./klien";

export type ProfilSaya = Profile & { email: string | null };

// --- Profil sendiri (GET/PATCH /api/profil, milik A). Di-cache per tab supaya
// menu akun di header tidak memanggil API di setiap pindah halaman.

let cacheProfil: Promise<ProfilSaya> | null = null;
const pendengar = new Set<(p: ProfilSaya) => void>();

export function ambilProfilSaya(): Promise<ProfilSaya> {
  cacheProfil ??= ambilJson<ProfilSaya>("/api/profil").catch((e: unknown) => {
    cacheProfil = null;
    throw e;
  });
  return cacheProfil;
}

export async function ubahProfilSaya(ubah: Partial<Pick<Profile, "nama" | "nama_usaha" | "kecamatan_id" | "no_hp">>) {
  const baru = await ambilJson<ProfilSaya>("/api/profil", { method: "PATCH", body: JSON.stringify(ubah) });
  cacheProfil = Promise.resolve(baru);
  pendengar.forEach((f) => f(baru));
  return baru;
}

/** Profil pengguna yang login; ikut berubah setelah ubahProfilSaya(). Null selama memuat/gagal. */
export function useProfilSaya(): ProfilSaya | null {
  const [profil, setProfil] = useState<ProfilSaya | null>(null);
  useEffect(() => {
    let aktif = true;
    ambilProfilSaya().then(
      (p) => aktif && setProfil(p),
      () => {},
    );
    pendengar.add(setProfil);
    return () => {
      aktif = false;
      pendengar.delete(setProfil);
    };
  }, []);
  return profil;
}

/** Huruf awal untuk avatar: "Siti Nurhaliza" → "SN". */
export function inisial(nama: string | null | undefined): string {
  const kata = (nama ?? "").trim().split(/\s+/).filter(Boolean);
  return ((kata[0]?.[0] ?? "") + (kata.length > 1 ? kata[kata.length - 1][0] : "")).toUpperCase() || "?";
}

/** Nomor tersimpan "6281234567890" → tampilan "081234567890". */
export function tampilNoHp(noHp: string | null): string {
  if (!noHp) return "";
  return noHp.startsWith("62") ? `0${noHp.slice(2)}` : noHp;
}
