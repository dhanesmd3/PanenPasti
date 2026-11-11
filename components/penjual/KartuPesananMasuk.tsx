"use client";

import Link from "next/link";
import { useState } from "react";
import type { OrderStatus, PesananLengkap } from "@/types";
import { BadgeStatus } from "@/components/ui/Badge";
import { Button, kelasTombol } from "@/components/ui/Button";
import { Ikon } from "@/components/ui/Ikon";
import { Galat } from "@/components/ui/Keadaan";
import { formatKg, formatRupiah } from "@/lib/format";
import { ambilJson, useNamaKomoditas } from "@/lib/klien";
import { waktuLalu } from "@/lib/notifikasi";
import { BATAS_KONFIRMASI_JAM } from "@/lib/pesanan";
import { tanggalPanjang } from "@/lib/tanggal";
import { FotoPanen } from "./bersama";

const ALASAN_TOLAK = ["Stok tidak cukup", "Tanggal tidak cocok", "Jarak terlalu jauh"];

export function namaPembeli(p: PesananLengkap): string {
  return p.pembeli.nama_usaha ?? p.pembeli.nama;
}

/** "Batal otomatis dalam 31 jam" untuk pesanan yang belum dijawab. */
function sisaWaktu(dibuatPada: string): string | null {
  const jam = (new Date(dibuatPada).getTime() + BATAS_KONFIRMASI_JAM * 3_600_000 - Date.now()) / 3_600_000;
  if (jam <= 0) return null;
  return jam < 1 ? "kurang dari 1 jam" : `${Math.floor(jam)} jam`;
}

/** Ringkasan isi pesanan: komoditas, jumlah, total. Dipakai kartu dan halaman gagal panen. */
export function RingkasanPesanan({ p }: { p: PesananLengkap }) {
  const nama = useNamaKomoditas(p.listing.komoditas_id);
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="flex flex-1 gap-3">
        <FotoPanen listing={p.listing} nama={nama} className="size-16 rounded-xl" />
        <div className="min-w-0">
          <p className="font-serif text-lg leading-tight">
            {formatKg(p.jumlah_kg)} {nama.toLowerCase()}
          </p>
          <p className="text-sm text-redup">
            {formatRupiah(p.harga_per_kg)}/kg · panen {tanggalPanjang(p.listing.tgl_panen)}
          </p>
          {p.alasan_batal && <p className="mt-1 text-sm text-cabai">Alasan: {p.alasan_batal}</p>}
        </div>
      </div>
      <div className="flex items-baseline justify-between rounded-xl bg-latar/70 px-4 py-2 sm:block sm:w-40 sm:text-right">
        <p className="text-sm text-redup">Total</p>
        <p className="font-narrow text-2xl font-bold">{formatRupiah(p.total_harga)}</p>
      </div>
    </div>
  );
}

export function KartuPesananMasuk({ p, setelahUbah }: { p: PesananLengkap; setelahUbah: () => void }) {
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [tolak, setTolak] = useState(false);
  const [alasan, setAlasan] = useState<string | null>(null);

  async function ubah(status: OrderStatus, alasanKirim?: string | null) {
    setProses(true);
    setGalat(null);
    try {
      await ambilJson(`/api/orders/${p.id}`, {
        method: "PATCH",
        body: JSON.stringify(alasanKirim ? { status, alasan: alasanKirim } : { status }),
      });
      setelahUbah();
    } catch (err) {
      setGalat((err as Error).message);
      setProses(false);
    }
  }

  const bisa = (s: OrderStatus) => p.aksi.includes(s);
  const menunggu = p.status === "menunggu";
  const batas = menunggu ? sisaWaktu(p.dibuat_pada) : null;

  return (
    <article
      className={`flex flex-col gap-4 rounded-2xl bg-kartu p-5 shadow-sm ${menunggu ? "ring-2 ring-kunyit-muda" : ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-pasir/70 text-daun">
            <Ikon nama="toko" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-serif text-lg leading-tight">{namaPembeli(p)}</p>
            <p className="text-sm text-redup">dipesan {waktuLalu(p.dibuat_pada)}</p>
          </div>
        </div>
        <BadgeStatus status={p.status} />
      </div>

      <RingkasanPesanan p={p} />

      {batas && (
        <p className="flex items-center gap-2 text-sm text-kunyit">
          <Ikon nama="jam" className="size-4" /> Jawab dalam {batas}, setelah itu pesanan batal otomatis.
        </p>
      )}

      {tolak ? (
        <div className="flex flex-col gap-3 rounded-xl bg-cabai-muda/60 p-4">
          <p className="font-serif text-base">Tolak pesanan {namaPembeli(p)}?</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Alasan menolak (tidak wajib)">
            {ALASAN_TOLAK.map((a) => (
              <button
                key={a}
                type="button"
                aria-pressed={alasan === a}
                onClick={() => setAlasan(alasan === a ? null : a)}
                className={`label-cetak min-h-11 rounded-full px-4 text-sm transition ${
                  alasan === a ? "bg-cabai text-kartu" : "bg-kartu text-teks ring-1 ring-garis hover:bg-pasir/60"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
          <p className="text-sm text-redup">Stok {formatKg(p.jumlah_kg)} kembali ke panen Anda.</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button varian="kedua" disabled={proses} onClick={() => setTolak(false)}>
              Batal
            </Button>
            <Button varian="bahaya" disabled={proses} onClick={() => ubah("ditolak", alasan)}>
              {proses ? "Menolak…" : "Ya, tolak pesanan"}
            </Button>
          </div>
        </div>
      ) : (
        (p.kontak || p.aksi.length > 0) && (
          <div className="flex flex-col gap-2 border-t border-garis/70 pt-4 sm:flex-row sm:flex-wrap sm:justify-end">
            {p.kontak?.wa_url && (
              <a href={p.kontak.wa_url} target="_blank" rel="noopener noreferrer" className={kelasTombol("kedua")}>
                <Ikon nama="pesan" className="size-4" /> WhatsApp {p.kontak.nama}
              </a>
            )}
            {p.kontak && !p.kontak.wa_url && (
              <p className="self-center text-sm text-redup">Pembeli belum mengisi nomor WhatsApp.</p>
            )}
            {bisa("gagal_panen") && (
              <Link href={`/penjual/pesanan/${p.id}/gagal-panen`} className={kelasTombol("bahaya")}>
                <Ikon nama="peringatan" className="size-4" /> Gagal panen
              </Link>
            )}
            {bisa("ditolak") && (
              <Button varian="bahaya" disabled={proses} onClick={() => setTolak(true)}>
                Tolak
              </Button>
            )}
            {bisa("dikirim") && (
              <Button
                disabled={proses}
                onClick={() => window.confirm(`Pesanan ${namaPembeli(p)} sudah dikirim?`) && ubah("dikirim")}
              >
                <Ikon nama="truk" className="size-4" /> {proses ? "Menyimpan…" : "Tandai dikirim"}
              </Button>
            )}
            {bisa("dikonfirmasi") && (
              <Button disabled={proses} onClick={() => ubah("dikonfirmasi")}>
                <Ikon nama="centang" className="size-4" /> {proses ? "Menyimpan…" : "Terima pesanan"}
              </Button>
            )}
          </div>
        )
      )}

      {bisa("dikonfirmasi") && !tolak && (
        <p className="-mt-2 text-sm text-redup sm:text-right">
          Setelah diterima, nomor WhatsApp Anda dan pembeli saling terlihat.
        </p>
      )}
      {galat && <Galat pesan={galat} />}
    </article>
  );
}
