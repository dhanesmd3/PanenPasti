"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { Peran } from "@/types";
import { Ikon, type NamaIkon } from "@/components/ui/Ikon";
import { inisial, useProfilSaya } from "@/lib/akun";

/** Avatar di header: buka menu Profil, Pengaturan, Keluar. */
export function MenuAkun({ peran }: { peran: Peran }) {
  const profil = useProfilSaya();
  const router = useRouter();
  const path = usePathname();
  const idMenu = useId();
  const akar = useRef<HTMLDivElement>(null);
  const tombol = useRef<HTMLButtonElement>(null);

  // Menu hanya terbuka di halaman tempat ia dibuka, jadi otomatis tertutup saat pindah halaman.
  const [bukaDi, setBukaDi] = useState<string | null>(null);
  const buka = bukaDi === path;
  const setBuka = (b: boolean) => setBukaDi(b ? path : null);

  // Tutup saat klik di luar atau tekan Escape.
  useEffect(() => {
    if (!buka) return;
    const klik = (e: PointerEvent) => {
      if (!akar.current?.contains(e.target as Node)) setBukaDi(null);
    };
    const tombolKeyboard = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setBukaDi(null);
        tombol.current?.focus();
      }
    };
    document.addEventListener("pointerdown", klik);
    document.addEventListener("keydown", tombolKeyboard);
    return () => {
      document.removeEventListener("pointerdown", klik);
      document.removeEventListener("keydown", tombolKeyboard);
    };
  }, [buka]);

  async function keluar() {
    await fetch("/api/auth/keluar", { method: "POST" }).catch(() => null);
    router.replace("/");
    router.refresh();
  }

  const item: { href: string; label: string; ikon: NamaIkon }[] = [
    { href: `/${peran}/profil`, label: "Profil saya", ikon: "orang" },
    { href: `/${peran}/pengaturan`, label: "Pengaturan", ikon: "atur" },
  ];

  return (
    <div ref={akar} className="relative">
      <button
        ref={tombol}
        type="button"
        onClick={() => setBuka(!buka)}
        aria-expanded={buka}
        aria-controls={idMenu}
        aria-label="Menu akun"
        className="flex size-10 items-center justify-center rounded-full bg-pasir font-narrow text-sm font-bold text-teks ring-2 ring-transparent transition hover:ring-terakota/50 aria-expanded:ring-terakota"
      >
        {profil ? inisial(profil.nama) : <Ikon nama="orang" />}
      </button>

      {buka && (
        <div
          id={idMenu}
          className="animasi-muncul absolute top-12 right-0 z-30 flex w-64 flex-col overflow-hidden rounded-2xl bg-kartu shadow-md ring-1 ring-garis"
        >
          <div className="border-b border-garis px-4 py-3">
            <p className="truncate font-serif text-lg leading-tight">{profil?.nama ?? "Memuat…"}</p>
            <p className="truncate text-sm text-redup">{profil?.nama_usaha ?? profil?.email ?? ""}</p>
          </div>
          <ul className="flex flex-col p-1.5">
            {item.map((m) => (
              <li key={m.href}>
                <Link
                  href={m.href}
                  aria-current={path === m.href ? "page" : undefined}
                  className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-base hover:bg-pasir/50 aria-[current=page]:bg-pasir/70"
                >
                  <Ikon nama={m.ikon} className="size-5 text-daun" /> {m.label}
                </Link>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={keluar}
                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-base text-cabai hover:bg-cabai-muda/60"
              >
                <Ikon nama="keluar" className="size-5" /> Keluar
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
