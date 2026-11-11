"use client";

import Link from "next/link";
import type { Listing } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { kelasTombol } from "@/components/ui/Button";
import { Ikon } from "@/components/ui/Ikon";
import { InfoHarga } from "@/components/pembeli/listing";
import { useNamaKomoditas } from "@/lib/klien";
import { tanggalPanjang } from "@/lib/tanggal";
import { BadgeStatusPanen, BarStok, FotoPanen } from "./bersama";

export function KartuPanen({ listing, sorot = false }: { listing: Listing; sorot?: boolean }) {
  const nama = useNamaKomoditas(listing.komoditas_id);
  const habis = listing.status === "habis" || listing.sisa_kg <= 0;

  return (
    <article
      className={`flex h-full flex-col gap-4 rounded-2xl bg-kartu p-4 shadow-sm transition md:p-5 ${
        sorot ? "ring-2 ring-terakota" : ""
      } ${habis ? "opacity-80" : ""}`}
    >
      <div className="flex gap-4">
        <FotoPanen listing={listing} nama={nama} className="size-20 rounded-xl sm:size-24" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap gap-1.5">
            <BadgeStatusPanen listing={listing} />
            {listing.is_surplus && (
              <Badge nada="merah" ikon="api">
                Surplus
              </Badge>
            )}
          </div>
          <h3 className="font-serif text-lg leading-snug">
            {nama}
            {listing.kualitas && <span className="text-redup"> · {listing.kualitas}</span>}
          </h3>
          <p className="flex items-center gap-1 text-sm text-redup">
            <Ikon nama="kalender" className="size-4" />
            Panen {tanggalPanjang(listing.tgl_panen)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <InfoHarga listing={listing} />
      </div>

      <BarStok listing={listing} />

      <div className={`mt-auto grid gap-2 border-t border-garis/70 pt-4 ${habis ? "grid-cols-1" : "grid-cols-2"}`}>
        <Link href={`/penjual/panen/${listing.id}`} className={kelasTombol("kedua", true)}>
          <Ikon nama="pensil" className="size-4" /> Ubah
        </Link>
        {!habis && (
          <Link
            href={`/penjual/panen/${listing.id}/surplus`}
            className={`${kelasTombol("kedua", true)} ${listing.is_surplus ? "text-cabai" : ""}`}
          >
            <Ikon nama="api" className="size-4" /> Surplus
          </Link>
        )}
      </div>
    </article>
  );
}
