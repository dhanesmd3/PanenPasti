import type { ReactNode } from "react";
import { IlustrasiLadang } from "@/components/ui/IlustrasiLadang";

/** Kerangka halaman Masuk/Daftar: ilustrasi di kiri (layar lebar), form di kanan. */
export function PanelAuth({ judul, teks, children }: { judul: string; teks: string; children: ReactNode }) {
  return (
    <main className="flex-1 px-4 py-8 md:py-12">
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-3xl bg-kartu shadow-md md:grid-cols-2">
        <div className="relative isolate hidden flex-col justify-end p-10 text-kartu md:flex">
          <IlustrasiLadang className="absolute inset-0 -z-10 size-full" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-teks/70 via-teks/10 to-transparent" />
          <p className="font-serif text-3xl leading-tight">Pesan sebelum panen. Harga dari petani.</p>
          <p className="mt-2 text-kartu/85">Pre-order yang adil, bukan ijon.</p>
        </div>
        <div className="flex flex-col gap-6 p-6 sm:p-10">
          <div>
            <h1 className="font-serif text-3xl">{judul}</h1>
            <p className="text-redup">{teks}</p>
          </div>
          {children}
        </div>
      </div>
    </main>
  );
}
