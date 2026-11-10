import type { ReactNode } from "react";
import { Button } from "./Button";

/** Tampilan loading, kosong, dan error yang dipakai semua halaman. */
export function Memuat({ teks = "Memuat…" }: { teks?: string }) {
  return (
    <div role="status" className="flex flex-col gap-3 py-6">
      <span className="sr-only">{teks}</span>
      {[0, 1, 2].map((i) => (
        <div key={i} className="kerangka h-24 rounded-2xl" />
      ))}
    </div>
  );
}

/** Kerangka loading untuk grid kartu produk. */
export function MemuatGrid({ jumlah = 8, className = "" }: { jumlah?: number; className?: string }) {
  return (
    <div role="status" className={className}>
      <span className="sr-only">Memuat…</span>
      {Array.from({ length: jumlah }, (_, i) => (
        <div key={i} className="kerangka aspect-[3/4] rounded-2xl" />
      ))}
    </div>
  );
}

export function Kosong({ judul, children }: { judul: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl bg-kartu/60 px-6 py-12 text-center">
      <p className="font-serif text-xl">{judul}</p>
      {children && <div className="text-base text-redup">{children}</div>}
    </div>
  );
}

export function Galat({ pesan, ulangi }: { pesan: string; ulangi?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-2xl bg-cabai-muda/70 p-5 text-cabai">
      <p className="text-base">{pesan}</p>
      {ulangi && (
        <Button varian="bahaya" onClick={ulangi}>
          Coba lagi
        </Button>
      )}
    </div>
  );
}
