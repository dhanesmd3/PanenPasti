"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Ikon } from "@/components/ui/Ikon";
import { Galat, Kosong, Memuat } from "@/components/ui/Keadaan";
import { FormPreOrder } from "@/components/pembeli/FormPreOrder";
import { DaftarUlasan } from "@/components/Ulasan";
import { FotoListing, InfoHarga, KOLOM_LISTING, keListingPenjual, namaPenjual } from "@/components/pembeli/listing";
import { pesanSupabase, useKecamatan, useMuat, useNamaKomoditas } from "@/lib/klien";
import { formatKg } from "@/lib/format";
import { buatSupabaseBrowser } from "@/lib/supabase/client";
import { tanggalPanjang } from "@/lib/tanggal";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  const kecamatan = useKecamatan();
  const { data, galat, memuat, muatUlang } = useMuat(async () => {
    const { data, error } = await buatSupabaseBrowser()
      .from("listings")
      .select(KOLOM_LISTING)
      .eq("id", id)
      .maybeSingle();
    if (error && error.code !== "22P02") throw new Error(pesanSupabase(error));
    return data ? keListingPenjual(data as unknown as Record<string, unknown>) : null;
  }, [id]);
  const nama = useNamaKomoditas(data?.listing.komoditas_id ?? 0);

  const kembali = (
    <Link href="/pembeli/katalog" className="label-cetak flex w-fit items-center gap-1 text-sm text-daun hover:underline">
      <Ikon nama="kembali" className="size-4" /> Katalog
    </Link>
  );

  if (memuat) return <>{kembali}<Memuat /></>;
  if (galat) return <>{kembali}<Galat pesan={galat} ulangi={muatUlang} /></>;
  if (!data) return <>{kembali}<Kosong judul="Panen tidak ditemukan">Mungkin sudah dihapus penjualnya.</Kosong></>;

  const { listing, penjual } = data;
  const kec = penjual ? kecamatan.get(penjual.kecamatan_id) : undefined;
  const tersedia = listing.sisa_kg > 0 && listing.status !== "habis";
  const terpesan = listing.jumlah_kg - listing.sisa_kg;
  const persenTerpesan = Math.round((terpesan / listing.jumlah_kg) * 100);

  const info: [string, ReactNode][] = [
    ["Tanggal panen", tanggalPanjang(listing.tgl_panen)],
    ["Stok tersisa", `${formatKg(listing.sisa_kg)} dari ${formatKg(listing.jumlah_kg)}`],
    ...(listing.kualitas ? ([["Kualitas", listing.kualitas]] as [string, string][]) : []),
  ];

  return (
    <>
      {kembali}
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)_320px]">
        <FotoListing listing={listing} className="aspect-square rounded-3xl shadow-sm" />

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Badge nada={listing.status === "siap" ? "hijau" : listing.status === "habis" ? "netral" : "kuning"}>
              {listing.status === "siap" ? "Siap panen" : listing.status === "habis" ? "Habis" : "Perkiraan panen"}
            </Badge>
            <h1 className="font-serif text-3xl leading-tight md:text-4xl">
              {nama}
              {listing.kualitas && <span className="text-redup"> · {listing.kualitas}</span>}
            </h1>
            <InfoHarga listing={listing} besar />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="h-2 overflow-hidden rounded-full bg-pasir/60">
              <div className="h-full rounded-full bg-terakota" style={{ width: `${persenTerpesan}%` }} />
            </div>
            <p className="text-sm text-redup">{persenTerpesan}% sudah dipesan pembeli lain</p>
          </div>

          <dl className="divide-y divide-garis/70 rounded-2xl bg-kartu px-5 shadow-sm">
            {info.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-3 text-sm">
                <dt className="text-redup">{k}</dt>
                <dd className="text-right">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-full bg-sage text-[#4c5a2c]">
              <Ikon nama="tunas" className="size-6" />
            </span>
            <div>
              <p className="font-serif text-lg leading-tight">{namaPenjual(penjual)}</p>
              <p className="flex items-center gap-1 text-sm text-redup">
                <Ikon nama="pin" className="size-3.5" />
                {kec ? `${kec.nama}, ${kec.kab_kota}` : "—"}
              </p>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-redup">
            Harga ditentukan petani. Nomor WhatsApp penjual muncul di Pesanan Saya setelah pesanan dikonfirmasi.
          </p>
        </div>

        <div className="flex flex-col gap-4 rounded-3xl bg-kartu p-6 shadow-md md:col-span-2 lg:sticky lg:top-24 lg:col-span-1 lg:self-start">
          <p className="font-serif text-xl">Atur pre-order</p>
          {tersedia ? (
            <FormPreOrder listing={listing} />
          ) : (
            <Kosong judul="Stok habis">Cari penjual lain di katalog.</Kosong>
          )}
        </div>
      </div>

      <section aria-labelledby="judul-ulasan" className="flex max-w-3xl flex-col gap-4">
        <h2 id="judul-ulasan" className="font-serif text-2xl">
          Ulasan untuk {namaPenjual(penjual)}
        </h2>
        <DaftarUlasan penjualId={listing.penjual_id} />
      </section>
    </>
  );
}
