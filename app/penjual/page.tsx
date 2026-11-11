"use client";

import Link from "next/link";
import type { PesananLengkap } from "@/types";
import { kelasTombol } from "@/components/ui/Button";
import { Ikon } from "@/components/ui/Ikon";
import { IlustrasiLadang } from "@/components/ui/IlustrasiLadang";
import { Galat, Kosong } from "@/components/ui/Keadaan";
import { BadgeStatusPanen, FotoPanen } from "@/components/penjual/bersama";
import { ambilPanenSaya, ambilProfilSaya, panenAktif, sapaan, tglPanenTerdekat } from "@/components/penjual/data";
import { KartuHargaRingkas } from "@/components/penjual/KartuHarga";
import { namaPembeli } from "@/components/penjual/KartuPesananMasuk";
import { formatKg, formatRupiah } from "@/lib/format";
import { ambilJson, useKecamatan, useMuat, useNamaKomoditas } from "@/lib/klien";
import { waktuLalu } from "@/lib/notifikasi";
import { tanggalPendek } from "@/lib/tanggal";
import type { Listing } from "@/types";

function PesananBaru() {
  const { data, galat, memuat, muatUlang } = useMuat(() =>
    ambilJson<PesananLengkap[]>("/api/orders?status=menunggu&batas=100"),
  );
  const n = data?.length ?? 0;

  return (
    <section
      aria-labelledby="judul-pesanan"
      className={`flex flex-col gap-4 rounded-2xl p-5 shadow-sm md:p-6 ${n ? "bg-kunyit-muda" : "bg-kartu"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 id="judul-pesanan" className="font-serif text-xl leading-snug">
          {memuat ? "Pesanan baru" : n ? `${n} pesanan baru menunggu jawaban` : "Belum ada pesanan baru"}
        </h2>
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
            n ? "bg-kunyit text-kartu" : "bg-pasir/70 text-daun"
          }`}
        >
          <Ikon nama="paket" />
        </span>
      </div>
      {memuat ? (
        <div role="status" className="flex flex-col gap-2">
          <span className="sr-only">Memuat pesanan…</span>
          <div className="kerangka h-14 rounded-xl" />
          <div className="kerangka h-14 rounded-xl" />
        </div>
      ) : galat ? (
        <Galat pesan={galat} ulangi={muatUlang} />
      ) : n ? (
        <ul className="flex flex-col gap-2">
          {data!.slice(0, 3).map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 rounded-xl bg-kartu/80 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-serif text-base leading-tight">{namaPembeli(p)}</p>
                <p className="text-sm text-redup">
                  {formatKg(p.jumlah_kg)} · {waktuLalu(p.dibuat_pada)}
                </p>
              </div>
              <p className="shrink-0 font-narrow text-lg font-bold">{formatRupiah(p.total_harga)}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-base text-redup">Pesanan dari warung akan muncul di sini. Kami kabari lewat notifikasi.</p>
      )}
      <Link href="/penjual/pesanan" className={`${kelasTombol(n ? "utama" : "kedua", true)} mt-auto`}>
        {n ? "Jawab pesanan" : "Lihat semua pesanan"} <Ikon nama="panah" className="size-4" />
      </Link>
    </section>
  );
}

function BarisPanen({ l }: { l: Listing }) {
  const nama = useNamaKomoditas(l.komoditas_id);
  return (
    <Link
      href={`/penjual/panen/${l.id}`}
      className="group flex h-full items-center gap-3 rounded-2xl bg-kartu p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <FotoPanen listing={l} nama={nama} className="size-16 rounded-xl" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate font-serif text-base leading-tight group-hover:text-daun">
          Panen {tanggalPendek(l.tgl_panen)}
        </p>
        <p className="text-sm text-redup">
          sisa {formatKg(l.sisa_kg)} dari {formatKg(l.jumlah_kg)}
        </p>
        <div>
          <BadgeStatusPanen listing={l} />
        </div>
      </div>
    </Link>
  );
}

export default function Page() {
  const profil = useMuat(ambilProfilSaya);
  const panen = useMuat(ambilPanenSaya);
  const kecamatan = useKecamatan();
  const aktif = panenAktif(panen.data ?? []);
  const kec = profil.data?.kecamatan_id ? kecamatan.get(profil.data.kecamatan_id) : undefined;

  return (
    <>
      <section className="relative isolate flex min-h-64 flex-col items-start justify-end gap-4 overflow-hidden rounded-3xl p-6 shadow-sm md:min-h-80 md:p-10">
        <IlustrasiLadang className="absolute inset-0 -z-10 size-full" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-teks/80 via-teks/30 to-transparent" />
        <div className="flex max-w-xl flex-col gap-1 text-kartu">
          <h1 className="font-serif text-3xl leading-tight md:text-5xl">{sapaan(profil.data?.nama)}</h1>
          <p className="text-kartu/90 md:text-lg">
            {profil.data
              ? [profil.data.nama_usaha, kec && `${kec.nama}, ${kec.kab_kota}`].filter(Boolean).join(" · ") ||
                "Catat panen, harga Anda yang menentukan."
              : "Catat panen, harga Anda yang menentukan."}
          </p>
        </div>
        <Link href="/penjual/panen/baru" className={kelasTombol("utama")}>
          <Ikon nama="tambah" className="size-5" /> Tambah panen
        </Link>
      </section>

      {profil.data && (!profil.data.kecamatan_id || !profil.data.no_hp) && (
        <p className="flex items-start gap-2 rounded-2xl bg-kunyit-muda px-4 py-3 text-base text-kunyit">
          <Ikon nama="peringatan" className="mt-0.5 size-5" />
          {!profil.data.kecamatan_id
            ? "Kecamatan Anda belum diisi. Pembeli butuh lokasi untuk mencocokkan panen."
            : "Nomor WhatsApp Anda belum diisi. Pembeli tidak bisa menghubungi Anda setelah pesanan diterima."}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        <PesananBaru />
        <KartuHargaRingkas tglPanen={panen.data ? tglPanenTerdekat(panen.data) : null} />
      </div>

      <section aria-labelledby="judul-panen" className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 id="judul-panen" className="font-serif text-2xl md:text-3xl">
              Panen saya
            </h2>
            <p className="text-sm text-redup">
              {aktif.length
                ? `${aktif.length} panen bisa dipesan · sisa ${formatKg(aktif.reduce((n, l) => n + l.sisa_kg, 0))}`
                : "Yang bisa dipesan pembeli saat ini."}
            </p>
          </div>
          <Link href="/penjual/panen" className="label-cetak flex min-h-11 items-center gap-1 text-sm text-daun hover:underline">
            Kelola <Ikon nama="panah" className="size-4" />
          </Link>
        </div>
        {panen.memuat && !panen.data ? (
          <div role="status" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <span className="sr-only">Memuat panen…</span>
            {[0, 1, 2].map((i) => (
              <div key={i} className="kerangka h-[88px] rounded-2xl" />
            ))}
          </div>
        ) : panen.galat ? (
          <Galat pesan={panen.galat} ulangi={panen.muatUlang} />
        ) : !aktif.length ? (
          <Kosong judul="Belum ada panen yang bisa dipesan">
            <p>Catat panen berikutnya, warung bisa langsung pre-order.</p>
            <Link href="/penjual/panen/baru" className={`${kelasTombol("utama")} mt-4`}>
              <Ikon nama="tambah" className="size-5" /> Tambah panen
            </Link>
          </Kosong>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {aktif.slice(0, 6).map((l) => (
              <li key={l.id}>
                <BarisPanen l={l} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
