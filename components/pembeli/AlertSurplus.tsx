"use client";

import Link from "next/link";
import type { Kecamatan } from "@/types";
import { Ikon } from "@/components/ui/Ikon";
import { formatKg } from "@/lib/format";
import { useMuat, useNamaKomoditas } from "@/lib/klien";
import { hariIniWib, tanggalPendek } from "@/lib/tanggal";
import { ambilListingMendatang, FotoListing, InfoHarga, namaPenjual, type ListingPenjual } from "./listing";

function KartuSurplus({ data, kecamatan }: { data: ListingPenjual; kecamatan?: Kecamatan }) {
  const { listing, penjual } = data;
  const nama = useNamaKomoditas(listing.komoditas_id);
  return (
    <Link
      href={`/pembeli/katalog/${listing.id}`}
      className="group flex h-full w-72 gap-3 rounded-2xl bg-kartu p-3 shadow-sm transition hover:shadow-md"
    >
      <FotoListing listing={listing} className="size-20 shrink-0 rounded-xl" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="truncate font-serif text-base leading-tight group-hover:text-daun">{nama}</p>
        <InfoHarga listing={listing} />
        <p className="truncate text-xs text-redup">
          {kecamatan?.nama ?? "—"} · {namaPenjual(penjual)}
        </p>
        <p className="text-xs text-redup">
          Panen {tanggalPendek(listing.tgl_panen)} · sisa {formatKg(listing.sisa_kg)}
        </p>
      </div>
    </Link>
  );
}

/** Alert surplus di beranda pembeli (F8). Tidak tampil kalau tidak ada surplus atau gagal dimuat. */
export function AlertSurplus({ kecamatan }: { kecamatan: Map<number, Kecamatan> }) {
  const { data } = useMuat(() => ambilListingMendatang({ dari: hariIniWib(), surplus: true, batas: 10 }));
  if (!data?.length) return null;

  return (
    <section aria-labelledby="judul-surplus" className="flex flex-col gap-3 rounded-3xl bg-cabai-muda/70 p-4 md:p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cabai text-kartu">
          <Ikon nama="api" />
        </span>
        <div>
          <h2 id="judul-surplus" className="font-serif text-xl text-cabai">
            Panen surplus, harga khusus
          </h2>
          <p className="text-sm text-redup">Petani sedang panen berlebih. Pesan sebelum stoknya habis.</p>
        </div>
      </div>
      <ul className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
        {data.map((d) => (
          <li key={d.listing.id} className="shrink-0">
            <KartuSurplus data={d} kecamatan={d.penjual ? kecamatan.get(d.penjual.kecamatan_id) : undefined} />
          </li>
        ))}
      </ul>
    </section>
  );
}
