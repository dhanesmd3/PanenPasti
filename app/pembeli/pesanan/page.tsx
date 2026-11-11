"use client";

import Link from "next/link";
import { useState } from "react";
import type { OrderStatus, PesananLengkap } from "@/types";
import { BadgeStatus } from "@/components/ui/Badge";
import { Button, kelasTombol } from "@/components/ui/Button";
import { Galat, Kosong, Memuat } from "@/components/ui/Keadaan";
import { FotoListing } from "@/components/pembeli/listing";
import { PenjualPengganti } from "@/components/pembeli/PenjualPengganti";
import { Ikon } from "@/components/ui/Ikon";
import { ambilJson, useMuat, useNamaKomoditas } from "@/lib/klien";
import { formatKg, formatRupiah } from "@/lib/format";
import { hariIniWib, tanggalPanjang } from "@/lib/tanggal";

const AKSI_PEMBELI: Partial<
  Record<OrderStatus, { label: string; konfirmasi: string; varian: "utama" | "bahaya" }>
> = {
  selesai: { label: "Tandai diterima", konfirmasi: "Barang sudah Anda terima?", varian: "utama" },
  dibatalkan: {
    label: "Batalkan",
    konfirmasi: "Batalkan pesanan ini? Stok dikembalikan ke penjual.",
    varian: "bahaya",
  },
};

const TAB: { label: string; status: OrderStatus[] | null }[] = [
  { label: "Semua", status: null },
  { label: "Berlangsung", status: ["menunggu", "dikonfirmasi", "dikirim"] },
  { label: "Selesai", status: ["selesai"] },
  { label: "Dibatalkan", status: ["ditolak", "dibatalkan", "gagal_panen"] },
];

function KartuPesanan({ p, setelahUbah }: { p: PesananLengkap; setelahUbah: () => void }) {
  const [galat, setGalat] = useState<string | null>(null);
  const [proses, setProses] = useState(false);
  const [lihatPengganti, setLihatPengganti] = useState(false);

  async function ubah(status: OrderStatus) {
    if (!window.confirm(AKSI_PEMBELI[status]!.konfirmasi)) return;
    setProses(true);
    setGalat(null);
    try {
      await ambilJson(`/api/orders/${p.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      setelahUbah();
    } catch (err) {
      setGalat((err as Error).message);
    } finally {
      setProses(false);
    }
  }

  const aksi = p.aksi.filter((s) => AKSI_PEMBELI[s]);
  const nama = useNamaKomoditas(p.listing.komoditas_id);

  return (
    <article className="flex flex-col gap-4 rounded-2xl bg-kartu p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 font-serif text-base">
            <Ikon nama="tunas" className="size-4 text-[#4c5a2c]" />
            {p.penjual.nama_usaha ?? p.penjual.nama}
          </span>
          <span className="text-redup">· dipesan {tanggalPanjang(hariIniWib(new Date(p.dibuat_pada)))}</span>
        </span>
        <BadgeStatus status={p.status} />
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex flex-1 gap-3">
          <Link href={`/pembeli/katalog/${p.listing_id}`} className="shrink-0">
            <FotoListing listing={p.listing} className="size-16 rounded-xl" />
          </Link>
          <div className="min-w-0">
            <p className="font-serif text-lg leading-tight">{nama}</p>
            <p className="text-sm text-redup">
              {formatKg(p.jumlah_kg)} × {formatRupiah(p.harga_per_kg)}/kg · panen{" "}
              {tanggalPanjang(p.listing.tgl_panen)}
            </p>
            {p.alasan_batal && <p className="mt-1 text-sm text-cabai">Alasan: {p.alasan_batal}</p>}
          </div>
        </div>
        <div className="flex items-baseline justify-between rounded-xl bg-latar/70 px-4 py-2 md:block md:w-44 md:text-right">
          <p className="text-sm text-redup">Total</p>
          <p className="font-narrow text-2xl font-bold">{formatRupiah(p.total_harga)}</p>
        </div>
      </div>

      {(p.kontak?.wa_url || p.status === "gagal_panen" || aksi.length > 0) && (
        <div className="flex flex-col gap-2 border-t border-garis/70 pt-4 sm:flex-row sm:justify-end">
          {p.kontak?.wa_url && (
            <a
              href={p.kontak.wa_url}
              target="_blank"
              rel="noopener noreferrer"
              className={kelasTombol("kedua")}
            >
              <Ikon nama="pesan" className="size-4" /> WhatsApp {p.kontak.nama}
            </a>
          )}
          {p.status === "gagal_panen" && (
            <Button varian="kedua" aria-expanded={lihatPengganti} onClick={() => setLihatPengganti((b) => !b)}>
              <Ikon nama="orang" className="size-4" />
              {lihatPengganti ? "Sembunyikan pengganti" : "Lihat penjual pengganti"}
            </Button>
          )}
          {aksi.map((s) => (
            <Button key={s} varian={AKSI_PEMBELI[s]!.varian} disabled={proses} onClick={() => ubah(s)}>
              {AKSI_PEMBELI[s]!.label}
            </Button>
          ))}
        </div>
      )}
      {lihatPengganti && (
        <section aria-label="Penjual pengganti" className="flex flex-col gap-3">
          <p className="text-sm text-redup">Panen serupa di sekitar tanggal yang sama, diurutkan dari yang paling cocok.</p>
          <PenjualPengganti pesanan={p} />
        </section>
      )}
      {galat && <Galat pesan={galat} />}
    </article>
  );
}

export default function Page() {
  const [tab, setTab] = useState(0);
  const { data, galat, memuat, muatUlang } = useMuat(() => ambilJson<PesananLengkap[]>("/api/orders"));
  const filter = TAB[tab].status;
  const tampil = (data ?? []).filter((p) => !filter || filter.includes(p.status));

  return (
    <>
      <h1 className="font-serif text-3xl md:text-4xl">Pesanan Saya</h1>
      <div role="tablist" className="flex gap-2 overflow-x-auto pb-1">
        {TAB.map((t, i) => (
          <button
            key={t.label}
            role="tab"
            aria-selected={tab === i}
            onClick={() => setTab(i)}
            className={`label-cetak min-h-10 shrink-0 rounded-full px-4 text-sm transition ${
              tab === i ? "bg-teks text-kartu" : "bg-kartu text-redup shadow-sm hover:text-teks"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {memuat && !data ? (
        <Memuat />
      ) : galat ? (
        <Galat pesan={galat} ulangi={muatUlang} />
      ) : !tampil.length ? (
        <Kosong judul={data?.length ? "Tidak ada pesanan di tab ini" : "Belum ada pesanan"}>
          <Link href="/pembeli/cari" className="font-semibold text-daun underline">
            Cari pemasok
          </Link>{" "}
          untuk membuat pre-order.
        </Kosong>
      ) : (
        <ul className="flex flex-col gap-3">
          {tampil.map((p) => (
            <li key={p.id}>
              <KartuPesanan p={p} setelahUbah={muatUlang} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
