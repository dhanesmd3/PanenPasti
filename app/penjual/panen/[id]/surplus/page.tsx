"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { Listing } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Button, kelasTombol } from "@/components/ui/Button";
import { Ikon } from "@/components/ui/Ikon";
import { Field, kelasInput } from "@/components/ui/Input";
import { Galat, Kosong, Memuat } from "@/components/ui/Keadaan";
import { InfoHarga } from "@/components/pembeli/listing";
import { FotoPanen, JudulHalaman, TautanKembali } from "@/components/penjual/bersama";
import { ambilSatuPanen } from "@/components/penjual/data";
import { formatKg, formatRupiah } from "@/lib/format";
import { ambilJson, useMuat, useNamaKomoditas } from "@/lib/klien";
import { tanggalPanjang } from "@/lib/tanggal";

const POTONGAN = [10, 20, 30];

/** Harga setelah potongan, dibulatkan ke Rp500 terdekat. */
function hargaPotong(normal: number, persen: number): number {
  return Math.max(100, Math.round((normal * (1 - persen / 100)) / 500) * 500);
}

function FormSurplus({ listing, setelah }: { listing: Listing; setelah: (l: Listing) => void }) {
  const nama = useNamaKomoditas(listing.komoditas_id);
  const [harga, setHarga] = useState(String(listing.harga_surplus ?? hargaPotong(listing.harga_per_kg, 20)));
  const [dicoba, setDicoba] = useState(false);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  const rupiah = Number(harga);
  const galatHarga =
    harga === "" || !Number.isInteger(rupiah) || rupiah < 100
      ? "Isi harga khusus, paling rendah Rp100/kg."
      : rupiah >= listing.harga_per_kg
        ? `Harga khusus harus di bawah harga biasa (${formatRupiah(listing.harga_per_kg)}/kg).`
        : null;
  const persen = galatHarga ? null : Math.round((1 - rupiah / listing.harga_per_kg) * 100);

  async function kirim(e: FormEvent) {
    e.preventDefault();
    setDicoba(true);
    if (galatHarga) return;
    setProses(true);
    setGalat(null);
    try {
      const baru = await ambilJson<Listing>(`/api/listings/${listing.id}/surplus`, {
        method: "POST",
        body: JSON.stringify({ harga_surplus: rupiah }),
      });
      setelah(baru);
    } catch (err) {
      setGalat((err as Error).message);
    } finally {
      setProses(false);
    }
  }

  async function lepas() {
    if (!window.confirm("Lepas tanda surplus? Harga kembali ke harga biasa.")) return;
    setProses(true);
    setGalat(null);
    try {
      setelah(await ambilJson<Listing>(`/api/listings/${listing.id}/surplus`, { method: "DELETE" }));
    } catch (err) {
      setGalat((err as Error).message);
    } finally {
      setProses(false);
    }
  }

  return (
    <form onSubmit={kirim} noValidate className="flex flex-col gap-6">
      <div className="flex gap-4 rounded-2xl bg-kartu p-4 shadow-sm">
        <FotoPanen listing={listing} nama={nama} className="size-20 rounded-xl" />
        <div className="flex min-w-0 flex-col gap-1">
          <p className="font-serif text-lg leading-snug">
            {nama}
            {listing.kualitas && <span className="text-redup"> · {listing.kualitas}</span>}
          </p>
          <p className="text-sm text-redup">
            Panen {tanggalPanjang(listing.tgl_panen)} · sisa {formatKg(listing.sisa_kg)}
          </p>
          <p className="text-sm">
            Harga biasa <span className="font-narrow text-base font-bold">{formatRupiah(listing.harga_per_kg)}/kg</span>
          </p>
        </div>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="label-cetak mb-1 text-sm text-redup">Potongan cepat</legend>
        <div className="grid grid-cols-3 gap-2">
          {POTONGAN.map((p) => {
            const nilai = hargaPotong(listing.harga_per_kg, p);
            const aktif = rupiah === nilai;
            return (
              <button
                key={p}
                type="button"
                aria-pressed={aktif}
                onClick={() => setHarga(String(nilai))}
                className={`flex min-h-16 flex-col items-center justify-center rounded-xl px-2 transition ${
                  aktif ? "bg-cabai text-kartu shadow-sm" : "bg-kartu text-teks ring-1 ring-garis hover:bg-cabai-muda"
                }`}
              >
                <span className="label-cetak text-sm">-{p}%</span>
                <span className="font-narrow text-lg font-bold">{formatRupiah(nilai)}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <Field label="Harga khusus per kg" htmlFor="harga-surplus" galat={dicoba ? galatHarga : null}>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center font-narrow text-lg text-redup">
            Rp
          </span>
          <input
            id="harga-surplus"
            inputMode="numeric"
            autoComplete="off"
            value={harga ? Number(harga).toLocaleString("id-ID") : ""}
            onChange={(e) => setHarga(e.target.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 7))}
            aria-invalid={dicoba && galatHarga ? true : undefined}
            aria-describedby={dicoba && galatHarga ? "harga-surplus-galat" : undefined}
            className={`${kelasInput} pl-12 font-narrow text-xl font-bold`}
          />
        </div>
      </Field>

      <section aria-labelledby="judul-pratinjau" className="flex flex-col gap-3 rounded-2xl bg-cabai-muda/70 p-4 md:p-5">
        <h2 id="judul-pratinjau" className="label-cetak text-sm text-cabai">
          Yang dilihat pembeli
        </h2>
        <div className="flex items-center gap-3 rounded-xl bg-kartu p-3 shadow-sm">
          <FotoPanen listing={listing} nama={nama} className="size-16 rounded-lg" />
          <div className="min-w-0">
            <Badge nada="merah" ikon="api">
              Surplus
            </Badge>
            <p className="mt-1 truncate font-serif text-base leading-tight">{nama}</p>
            {persen != null ? (
              <InfoHarga listing={{ ...listing, is_surplus: true, harga_surplus: rupiah }} />
            ) : (
              <p className="text-sm text-redup">Isi harga khusus dulu.</p>
            )}
          </div>
        </div>
        <ul className="flex flex-col gap-1.5 text-sm text-teks">
          <li className="flex gap-2">
            <Ikon nama="lonceng" className="mt-0.5 size-4 text-cabai" />
            Pembeli di sekitar Anda langsung mendapat notifikasi.
          </li>
          <li className="flex gap-2">
            <Ikon nama="api" className="mt-0.5 size-4 text-cabai" />
            Panen ini tampil di bagian &ldquo;Panen surplus&rdquo; di beranda pembeli.
          </li>
        </ul>
      </section>

      {galat && <Galat pesan={galat} />}
      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Button type="submit" penuh disabled={proses}>
          <Ikon nama="api" className="size-4" />
          {proses ? "Menyimpan…" : listing.is_surplus ? "Simpan harga surplus" : "Tandai surplus"}
        </Button>
        {listing.is_surplus && (
          <Button varian="kedua" penuh disabled={proses} onClick={lepas}>
            Lepas tanda surplus
          </Button>
        )}
      </div>
    </form>
  );
}

export default function Page() {
  const { id } = useParams<{ id: string }>();
  const { data, galat, memuat, muatUlang } = useMuat(() => ambilSatuPanen(id), [id]);
  const [hasil, setHasil] = useState<Listing | null>(null);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <TautanKembali href="/penjual/panen">Panen Saya</TautanKembali>
      <JudulHalaman
        judul="Panen berlebih?"
        sub="Beri harga khusus supaya cepat terserap, tidak terbuang atau dijual murah ke pengepul."
      />
      {hasil ? (
        <div role="status" className="flex flex-col items-center gap-3 rounded-2xl bg-sage/70 p-6 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-kartu text-[#4c5a2c]">
            <Ikon nama="centang" className="size-6" />
          </span>
          {hasil.is_surplus ? (
            <>
              <p className="font-serif text-xl leading-snug">
                Surplus aktif: {formatRupiah(hasil.harga_surplus ?? 0)}/kg
              </p>
              <p className="text-base text-redup">Pembeli di sekitar Anda sudah diberi tahu.</p>
            </>
          ) : (
            <>
              <p className="font-serif text-xl leading-snug">Tanda surplus dilepas</p>
              <p className="text-base text-redup">Harga kembali {formatRupiah(hasil.harga_per_kg)}/kg.</p>
            </>
          )}
          <Link href="/penjual/panen" className={kelasTombol("utama", true)}>
            Kembali ke Panen Saya
          </Link>
        </div>
      ) : memuat && !data ? (
        <Memuat />
      ) : galat ? (
        <Galat pesan={galat} ulangi={muatUlang} />
      ) : !data ? (
        <Kosong judul="Panen tidak ditemukan">Mungkin sudah dihapus.</Kosong>
      ) : data.status === "habis" || data.sisa_kg <= 0 ? (
        <Kosong judul="Stok panen ini sudah habis">Panen yang habis tidak perlu ditandai surplus.</Kosong>
      ) : (
        <FormSurplus listing={data} setelah={setHasil} />
      )}
    </div>
  );
}
