import Link from "next/link";
import { Suspense } from "react";
import { MenuAkun } from "@/components/akun/MenuAkun";
import { LoncengNotifikasi } from "@/components/LoncengNotifikasi";
import { NavAtas, NavBawah } from "@/components/penjual/NavPenjual";

// Kerangka sama dengan sisi pembeli (header, isi, navigasi bawah), tanpa kotak cari:
// UI penjual sengaja lebih sederhana (PRD 5.1).
export default function Layout({ children }: LayoutProps<"/penjual">) {
  return (
    <div className="flex flex-1 flex-col pb-24 lg:pb-12">
      <header className="sticky top-0 z-20 border-b border-garis/70 bg-kartu/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Link href="/penjual" className="shrink-0 font-serif text-2xl leading-none">
            Panen<span className="text-daun italic">Pasti</span>
          </Link>
          <span className="label-cetak hidden rounded-full bg-sage px-2.5 py-0.5 text-xs text-[#4c5a2c] sm:inline">
            Penjual
          </span>
          <div className="ml-auto flex items-center gap-1 lg:gap-4">
            <Suspense>
              <NavAtas />
            </Suspense>
            <div className="flex items-center gap-1">
              <Suspense>
                <LoncengNotifikasi />
              </Suspense>
              <Suspense fallback={<span className="size-10 rounded-full bg-pasir" />}>
                <MenuAkun peran="penjual" />
              </Suspense>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 md:py-8">{children}</main>
      <Suspense>
        <NavBawah />
      </Suspense>
    </div>
  );
}
