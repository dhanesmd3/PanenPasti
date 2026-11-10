import Image from "next/image";
import Link from "next/link";
import type { Kecamatan, Listing, ProfilPublik } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Ikon } from "@/components/ui/Ikon";
import { GambarKomoditas } from "@/components/ui/IlustrasiLadang";
import { KOLOM_LISTING_MATCH } from "@/lib/kandidat";
import { formatKg, formatRupiah } from "@/lib/format";
import { pesanSupabase, useNamaKomoditas } from "@/lib/klien";
import { keListing, keProfilPublik } from "@/lib/pesanan";
import { buatSupabaseBrowser } from "@/lib/supabase/client";
import { tanggalPendek } from "@/lib/tanggal";

/** Kolom select listing + profil penjual (sama dengan /api/match). */
export const KOLOM_LISTING = KOLOM_LISTING_MATCH;

export interface ListingPenjual {
  listing: Listing;
  penjual: ProfilPublik | null;
}

export function keListingPenjual(b: Record<string, unknown>): ListingPenjual {
  return {
    listing: keListing(b),
    penjual: b.penjual ? keProfilPublik(b.penjual as Record<string, unknown>) : null,
  };
}

/** Listing yang masih punya stok, panen terdekat dulu. */
export async function ambilListingMendatang({
  komoditasId,
  dari,
  sampai,
  batas = 200,
}: {
  komoditasId?: number;
  dari?: string;
  sampai?: string;
  batas?: number;
}): Promise<ListingPenjual[]> {
  let q = buatSupabaseBrowser()
    .from("listings")
    .select(KOLOM_LISTING)
    .neq("status", "habis")
    .gt("sisa_kg", 0)
    .order("tgl_panen")
    .limit(batas);
  if (komoditasId) q = q.eq("komoditas_id", komoditasId);
  if (dari) q = q.gte("tgl_panen", dari);
  if (sampai) q = q.lte("tgl_panen", sampai);
  const { data, error } = await q;
  if (error) throw new Error(pesanSupabase(error));
  return (data as unknown as Record<string, unknown>[]).map(keListingPenjual);
}

/** Harga yang dibayar pembeli saat ini (harga surplus kalau sedang surplus). */
export function hargaBerlaku(l: Listing): number {
  return l.is_surplus && l.harga_surplus != null ? l.harga_surplus : l.harga_per_kg;
}

export function namaPenjual(p: ProfilPublik | null): string {
  return p?.nama_usaha ?? p?.nama ?? "Penjual";
}

export function InfoHarga({ listing, besar = false }: { listing: Listing; besar?: boolean }) {
  return (
    <div>
      <p className={`font-narrow font-bold ${besar ? "text-4xl" : "text-xl"}`}>
        {formatRupiah(hargaBerlaku(listing))}
        <span className="text-sm font-normal text-redup">/kg</span>
      </p>
      {listing.is_surplus && (
        <p className="flex items-center gap-1 text-sm">
          <span className="rounded bg-cabai-muda px-1 font-narrow font-semibold text-cabai">
            -{Math.round((1 - hargaBerlaku(listing) / listing.harga_per_kg) * 100)}%
          </span>
          <span className="text-redup line-through">{formatRupiah(listing.harga_per_kg)}</span>
        </p>
      )}
    </div>
  );
}

export function FotoListing({ listing, className = "" }: { listing: Listing; className?: string }) {
  const nama = useNamaKomoditas(listing.komoditas_id);
  return (
    <div className={`relative overflow-hidden bg-pasir ${className}`}>
      {listing.foto_url ? (
        // unoptimized: foto dari Supabase Storage, tidak lewat optimizer Next.
        <Image src={listing.foto_url} alt="" fill unoptimized className="object-cover" />
      ) : (
        <GambarKomoditas
          nama={nama}
          benih={listing.id}
          className="absolute inset-0 size-full transition duration-500 group-hover:scale-105"
        />
      )}
      {listing.is_surplus && (
        <span className="absolute top-2 left-2">
          <Badge nada="merah" ikon="api">
            Surplus
          </Badge>
        </span>
      )}
    </div>
  );
}

/** Kartu produk untuk grid katalog. */
export function KartuListing({ data, kecamatan }: { data: ListingPenjual; kecamatan?: Kecamatan }) {
  const { listing, penjual } = data;
  const nama = useNamaKomoditas(listing.komoditas_id);
  return (
    <Link
      href={`/pembeli/katalog/${listing.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl bg-kartu shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <FotoListing listing={listing} className="aspect-[4/3]" />
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <p className="line-clamp-2 font-serif text-base leading-snug group-hover:text-daun">
          {nama}
          {listing.kualitas && <span className="text-redup"> · {listing.kualitas}</span>}
        </p>
        <InfoHarga listing={listing} />
        <p className="flex items-center gap-1 text-xs text-redup">
          <Ikon nama="kalender" className="size-3.5" />
          Panen {tanggalPendek(listing.tgl_panen)} · sisa {formatKg(listing.sisa_kg)}
        </p>
        <div className="mt-auto flex flex-col gap-2 pt-2">
          <Badge nada={listing.status === "siap" ? "hijau" : "kuning"}>
            {listing.status === "siap" ? "Siap panen" : "Perkiraan"}
          </Badge>
          <p className="flex items-center gap-1 truncate text-xs text-redup">
            <Ikon nama="pin" className="size-3.5" />
            <span className="truncate">
              {kecamatan ? kecamatan.nama : "—"} · {namaPenjual(penjual)}
            </span>
          </p>
        </div>
      </div>
    </Link>
  );
}

export const KELAS_GRID_PRODUK =
  "grid grid-cols-2 gap-4 *:min-w-0 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";
