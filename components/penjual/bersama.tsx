// Potongan tampilan kecil yang dipakai beberapa halaman penjual.

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Listing } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Ikon } from "@/components/ui/Ikon";
import { GambarKomoditas } from "@/components/ui/IlustrasiLadang";
import { formatKg } from "@/lib/format";

export function TautanKembali({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="label-cetak -my-2 flex min-h-11 w-fit items-center gap-1 text-sm text-daun hover:underline"
    >
      <Ikon nama="kembali" className="size-4" /> {children}
    </Link>
  );
}

export function JudulHalaman({ judul, sub, aksi }: { judul: string; sub?: ReactNode; aksi?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-3xl leading-tight md:text-4xl">{judul}</h1>
        {sub && <p className="text-base text-redup">{sub}</p>}
      </div>
      {aksi}
    </div>
  );
}

/** Foto panen, atau gambar pengganti kalau penjual tidak mengunggah foto. */
export function FotoPanen({ listing, nama, className = "" }: { listing: Listing; nama: string; className?: string }) {
  return (
    <div className={`relative shrink-0 overflow-hidden bg-pasir ${className}`}>
      {listing.foto_url ? (
        // unoptimized: foto dari Supabase Storage, tidak lewat optimizer Next.
        <Image src={listing.foto_url} alt="" fill unoptimized className="object-cover" />
      ) : (
        <GambarKomoditas nama={nama} benih={listing.id} className="absolute inset-0 size-full" />
      )}
    </div>
  );
}

export function BadgeStatusPanen({ listing }: { listing: Listing }) {
  if (listing.status === "habis" || listing.sisa_kg <= 0) {
    return <Badge nada="netral">Habis</Badge>;
  }
  return listing.status === "siap" ? (
    <Badge nada="hijau" ikon="centang">
      Siap panen
    </Badge>
  ) : (
    <Badge nada="kuning" ikon="jam">
      Perkiraan
    </Badge>
  );
}

/** Berapa yang sudah dipesan dari total panen. */
export function BarStok({ listing }: { listing: Listing }) {
  const terpesan = Math.max(0, listing.jumlah_kg - listing.sisa_kg);
  const persen = Math.min(100, Math.round((terpesan / listing.jumlah_kg) * 100));
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span>
          <span className="font-narrow text-base font-bold">{formatKg(terpesan)}</span>{" "}
          <span className="text-redup">sudah dipesan</span>
        </span>
        <span className="text-redup">sisa {formatKg(listing.sisa_kg)}</span>
      </div>
      <div
        role="progressbar"
        aria-label="Bagian panen yang sudah dipesan"
        aria-valuenow={persen}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 overflow-hidden rounded-full bg-pasir/60"
      >
        <div className="h-full rounded-full bg-terakota transition-[width] duration-500" style={{ width: `${persen}%` }} />
      </div>
    </div>
  );
}

/** Bilah keterangan "Dibuat oleh AI" (PRD 8.1). */
export function LabelAI({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-xl bg-kunyit-muda px-3 py-2 text-sm text-kunyit">
      <Ikon nama="kilau" className="mt-0.5 size-4" />
      <span>{children}</span>
    </p>
  );
}
