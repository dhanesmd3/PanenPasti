"use client";

import Link from "next/link";
import { useState } from "react";
import type { HasilMatching, Kecamatan } from "@/types";
import { Ikon } from "@/components/ui/Ikon";
import { Button } from "@/components/ui/Button";
import { formatKg } from "@/lib/format";
import { tanggalPendek } from "@/lib/tanggal";
import { FormPreOrder } from "./FormPreOrder";
import { FotoListing, InfoHarga, namaPenjual } from "./listing";

export function KartuMatching({
  hasil,
  kecamatan,
  jumlahKg,
  kebutuhanId,
}: {
  hasil: HasilMatching;
  kecamatan?: Kecamatan;
  jumlahKg: number;
  kebutuhanId: string | null;
}) {
  const [buka, setBuka] = useState(false);
  const { listing, penjual, skor } = hasil;
  const nada = skor >= 75 ? "#6f7f52" : skor >= 50 ? "#c99a63" : "#a08a72";
  return (
    <div className="flex h-full flex-col gap-4 rounded-2xl bg-kartu p-4 shadow-sm">
      <div className="flex gap-4">
        <Link href={`/pembeli/katalog/${listing.id}`} className="shrink-0">
          <FotoListing listing={listing} className="size-20 rounded-xl" />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="truncate font-serif text-lg leading-tight">{namaPenjual(penjual)}</p>
          <InfoHarga listing={listing} />
          <p className="flex items-center gap-1 text-xs text-redup">
            <Ikon nama="pin" className="size-3.5" />
            <span className="truncate">
              {kecamatan?.nama ?? "—"} · {Math.round(hasil.jarak_km)} km
            </span>
          </p>
        </div>
        {/* Cincin skor: seberapa cocok panen ini dengan kebutuhan. */}
        <div
          className="flex size-14 shrink-0 items-center justify-center rounded-full"
          style={{ background: `conic-gradient(${nada} ${skor * 3.6}deg, #e8d2bb 0deg)` }}
          title="Skor kecocokan"
        >
          <span className="flex size-11 flex-col items-center justify-center rounded-full bg-kartu font-narrow leading-none">
            <span className="text-lg font-bold">{Math.round(skor)}</span>
            <span className="text-[9px] tracking-wider text-redup uppercase">cocok</span>
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-redup">
        <span className="flex items-center gap-1">
          <Ikon nama="kalender" className="size-3.5" /> Panen {tanggalPendek(listing.tgl_panen)}
        </span>
        <span className="flex items-center gap-1">
          <Ikon nama="paket" className="size-3.5" /> Sisa {formatKg(listing.sisa_kg)}
        </span>
      </div>
      <p className="rounded-xl bg-latar/70 px-4 py-2.5 text-sm text-redup">
        <span className="text-teks">Kenapa cocok:</span> {hasil.alasan}
      </p>
      <div className="mt-auto">
        {buka ? (
          <FormPreOrder listing={listing} jumlahAwal={jumlahKg} kebutuhanId={kebutuhanId} />
        ) : (
          <Button penuh onClick={() => setBuka(true)}>
            Pre-order
          </Button>
        )}
      </div>
    </div>
  );
}
