import Link from "next/link";
import { Suspense } from "react";
import { LoncengNotifikasi } from "@/components/LoncengNotifikasi";
import { Tutorial } from "@/components/Tutorial";
import { NavAtas, NavBawah, TombolKeluar } from "@/components/pembeli/NavPembeli";
import { Ikon } from "@/components/ui/Ikon";

function KotakCari({ id, className = "" }: { id: string; className?: string }) {
  return (
    <form action="/pembeli/cari" role="search" className={`relative ${className}`}>
      <label htmlFor={id} className="sr-only">
        Tulis kebutuhan
      </label>
      <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-redup">
        <Ikon nama="cari" className="size-4" />
      </span>
      <input
        id={id}
        name="q"
        placeholder="Tulis kebutuhan, mis. 20 kg cabai rawit tiap Senin"
        className="h-11 w-full rounded-full bg-latar pr-4 pl-11 text-sm text-teks placeholder:text-redup/70 focus:ring-4 focus:ring-terakota/25 focus:outline-none"
      />
    </form>
  );
}

export default function Layout({ children }: LayoutProps<"/pembeli">) {
  return (
    <div className="flex flex-1 flex-col pb-24 lg:pb-12">
      <header className="sticky top-0 z-20 border-b border-garis/70 bg-kartu/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Link href="/pembeli" className="shrink-0 font-serif text-2xl leading-none">
            Panen<span className="text-daun italic">Pasti</span>
          </Link>
          <KotakCari id="q-cari-lebar" className="hidden flex-1 md:block" />
          <Suspense>
            <NavAtas />
          </Suspense>
          <div className="ml-auto flex items-center gap-1 md:ml-0">
            <Suspense>
              <LoncengNotifikasi />
            </Suspense>
            <Tutorial peran="pembeli" />
            <TombolKeluar />
          </div>
        </div>
        <div className="px-4 pb-3 md:hidden">
          <KotakCari id="q-cari-hp" />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 md:py-8">{children}</main>
      <Suspense>
        <NavBawah />
      </Suspense>
    </div>
  );
}
