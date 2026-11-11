"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Ikon } from "@/components/ui/Ikon";

/** Tombol lonceng + badge jumlah notifikasi belum dibaca. Dipakai header kedua peran. */
export function LoncengNotifikasi() {
  const path = usePathname();
  const [jumlah, setJumlah] = useState(0);

  useEffect(() => {
    let batal = false;
    const muat = () =>
      fetch("/api/notifikasi/jumlah")
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { belum_dibaca?: number } | null) => !batal && setJumlah(d?.belum_dibaca ?? 0))
        .catch(() => {});
    muat();
    // shortcut: diperbarui saat pindah halaman / tab aktif lagi, bukan realtime; pakai Supabase Realtime kalau perlu instan.
    window.addEventListener("focus", muat);
    window.addEventListener("notifikasi-berubah", muat);
    return () => {
      batal = true;
      window.removeEventListener("focus", muat);
      window.removeEventListener("notifikasi-berubah", muat);
    };
  }, [path]);

  return (
    <Link
      href="/notifikasi"
      aria-label={jumlah ? `Notifikasi, ${jumlah} belum dibaca` : "Notifikasi"}
      className="relative flex size-10 items-center justify-center rounded-full text-redup transition hover:bg-pasir/60 hover:text-teks"
    >
      <Ikon nama="lonceng" />
      {jumlah > 0 && (
        <span
          aria-hidden
          className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-cabai px-1 font-narrow text-[10px] leading-none font-bold text-kartu"
        >
          {jumlah > 9 ? "9+" : jumlah}
        </span>
      )}
    </Link>
  );
}
