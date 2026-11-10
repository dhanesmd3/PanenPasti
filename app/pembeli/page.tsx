"use client";

import Link from "next/link";
import { kelasTombol } from "@/components/ui/Button";
import { Ikon, type NamaIkon } from "@/components/ui/Ikon";
import { IlustrasiLadang } from "@/components/ui/IlustrasiLadang";
import { Galat, Kosong, MemuatGrid } from "@/components/ui/Keadaan";
import { ambilListingMendatang, KartuListing, KELAS_GRID_PRODUK } from "@/components/pembeli/listing";
import { useKecamatan, useMuat } from "@/lib/klien";
import { hariIniWib } from "@/lib/tanggal";

const PINTASAN: { href: string; ikon: NamaIkon; judul: string; teks: string }[] = [
  { href: "/pembeli/cari", ikon: "kilau", judul: "Cari Pemasok", teks: "Tulis kebutuhan, dicocokkan otomatis" },
  { href: "/pembeli/katalog", ikon: "kalender", judul: "Katalog Musiman", teks: "Semua panen yang akan datang" },
  { href: "/pembeli/pesanan", ikon: "paket", judul: "Pesanan Saya", teks: "Status & kontak penjual" },
  { href: "/notifikasi", ikon: "lonceng", judul: "Notifikasi", teks: "Kabar terbaru pesanan" },
];

// shortcut: alert surplus menyusul (Hari 5).
export default function Page() {
  const kecamatan = useKecamatan();
  const { data, galat, memuat, muatUlang } = useMuat(() => ambilListingMendatang({ dari: hariIniWib(), batas: 10 }));

  return (
    <>
      <section className="relative isolate flex min-h-72 flex-col items-start justify-end gap-4 overflow-hidden rounded-3xl p-6 shadow-sm md:min-h-96 md:p-10">
        <IlustrasiLadang className="absolute inset-0 -z-10 size-full" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-teks/75 via-teks/25 to-transparent" />
        <div className="flex max-w-xl flex-col gap-2 text-kartu">
          <h1 className="font-serif text-3xl leading-tight md:text-5xl">Amankan bahan baku sebelum harga naik</h1>
          <p className="text-kartu/90 md:text-lg">Pre-order langsung dari petani, harga ditentukan petani.</p>
        </div>
        <Link href="/pembeli/cari" className={kelasTombol("utama")}>
          Cari pemasok <Ikon nama="panah" className="size-4" />
        </Link>
      </section>

      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {PINTASAN.map((p) => (
          <li key={p.href}>
            <Link
              href={p.href}
              className="group flex h-full flex-col gap-3 rounded-2xl bg-kartu p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-pasir/70 text-daun">
                <Ikon nama={p.ikon} />
              </span>
              <span>
                <span className="block font-serif text-base leading-snug group-hover:text-daun">{p.judul}</span>
                <span className="block text-xs text-redup">{p.teks}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <section className="flex flex-col gap-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-serif text-2xl md:text-3xl">Panen terdekat</h2>
            <p className="text-sm text-redup">Pesan sekarang, diambil saat panen.</p>
          </div>
          <Link href="/pembeli/katalog" className="label-cetak flex items-center gap-1 text-sm text-daun hover:underline">
            Lihat semua <Ikon nama="panah" className="size-4" />
          </Link>
        </div>
        {memuat ? (
          <MemuatGrid jumlah={5} className={KELAS_GRID_PRODUK} />
        ) : galat ? (
          <Galat pesan={galat} ulangi={muatUlang} />
        ) : !data?.length ? (
          <Kosong judul="Belum ada panen mendatang">Cek lagi nanti, petani menambah panen setiap minggu.</Kosong>
        ) : (
          <ul className={KELAS_GRID_PRODUK}>
            {data.map((d) => (
              <li key={d.listing.id}>
                <KartuListing data={d} kecamatan={d.penjual ? kecamatan.get(d.penjual.kecamatan_id) : undefined} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
