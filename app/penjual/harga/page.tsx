"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { kelasTombol } from "@/components/ui/Button";
import { Ikon } from "@/components/ui/Ikon";
import { Galat, Memuat } from "@/components/ui/Keadaan";
import { JudulHalaman } from "@/components/penjual/bersama";
import { ambilPanenSaya, ambilPrediksi, panenAktif, tglPanenTerdekat } from "@/components/penjual/data";
import { GrafikHarga } from "@/components/penjual/GrafikHarga";
import { ArahHarga, BadgeSaran, PenjelasanHarga, rentangMinggu } from "@/components/penjual/KartuHarga";
import { formatKg, formatRupiah } from "@/lib/format";
import { useMuat, useNamaKomoditas } from "@/lib/klien";
import { hariIniWib, tanggalPanjang, tanggalPendek } from "@/lib/tanggal";

function BarisSurplus({ id, komoditasId, sisa, tgl, surplus }: { id: string; komoditasId: number; sisa: number; tgl: string; surplus: boolean }) {
  const nama = useNamaKomoditas(komoditasId);
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="font-serif text-base leading-snug">
          {nama} · sisa {formatKg(sisa)}
        </p>
        <p className="text-sm text-redup">Panen {tanggalPendek(tgl)}</p>
      </div>
      {surplus ? (
        <Link href={`/penjual/panen/${id}/surplus`} className="label-cetak flex min-h-11 items-center gap-2">
          <Badge nada="merah" ikon="api">
            Surplus aktif
          </Badge>
          <Ikon nama="panah" className="size-4 text-daun" />
        </Link>
      ) : (
        <Link href={`/penjual/panen/${id}/surplus`} className={kelasTombol("kedua")}>
          <Ikon nama="api" className="size-4" /> Tandai surplus
        </Link>
      )}
    </li>
  );
}

export default function Page() {
  const panen = useMuat(ambilPanenSaya);
  const aktif = panenAktif(panen.data ?? []);
  const hariIni = hariIniWib();
  const pilihanTgl = [...new Set(aktif.map((l) => l.tgl_panen).filter((t) => t >= hariIni))].slice(0, 4);

  const [tglPilih, setTglPilih] = useState<string | null | undefined>(undefined);
  // Bawaan: panen terdekat. Menunggu daftar panen supaya prediksi tidak dimuat dua kali.
  const tglPanen = tglPilih !== undefined ? tglPilih : tglPanenTerdekat(panen.data ?? []);
  const siap = !panen.memuat || !!panen.data || !!panen.galat;
  const { data, galat, memuat, muatUlang } = useMuat(
    () => (siap ? ambilPrediksi(tglPanen) : Promise.resolve(undefined as never)),
    [siap, tglPanen],
  );
  const panenMinggu = data?.prediksi_petani.find((p) => p.tanggal === data.minggu_panen);

  return (
    <>
      <JudulHalaman judul="Harga Cabai Rawit" sub="Perkiraan harga di tingkat petani, supaya Anda tahu kapan sebaiknya menjual." />

      {pilihanTgl.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="label-cetak text-sm text-redup">Sesuaikan dengan panen Anda</p>
          <div className="flex flex-wrap gap-2">
            {pilihanTgl.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={tglPanen === t}
                onClick={() => setTglPilih(t)}
                className={`label-cetak flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm transition ${
                  tglPanen === t ? "bg-teks text-kartu" : "bg-kartu text-redup shadow-sm hover:text-teks"
                }`}
              >
                <Ikon nama="kalender" className="size-4" /> Panen {tanggalPendek(t)}
              </button>
            ))}
          </div>
        </div>
      )}

      {memuat || !siap ? (
        <Memuat teks="Memuat harga…" />
      ) : galat || !data ? (
        <Galat pesan={galat ?? "Harga belum bisa dimuat."} ulangi={muatUlang} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
          <section aria-labelledby="judul-ringkas" className="flex flex-col gap-5 rounded-3xl bg-kartu p-5 shadow-sm md:p-6">
            <h2 id="judul-ringkas" className="sr-only">
              Ringkasan harga
            </h2>
            <div className="flex flex-col gap-1">
              <p className="text-sm text-redup">Perkiraan harga di petani sekarang</p>
              <p className="font-narrow text-5xl font-bold">
                {formatRupiah(data.harga_terakhir.petani_perkiraan)}
                <span className="text-lg font-normal text-redup">/kg</span>
              </p>
            </div>
            <div className="flex flex-col gap-3 rounded-2xl bg-latar/70 p-4">
              <p className="text-sm text-redup">Perkiraan di minggu panen ({rentangMinggu(data.minggu_panen)})</p>
              <p className="font-narrow text-3xl font-bold">
                {formatRupiah(panenMinggu?.nilai ?? data.harga_terakhir.petani_perkiraan)}
                <span className="text-base font-normal text-redup">/kg</span>
              </p>
              {panenMinggu && (
                <p className="text-sm text-redup">
                  Kemungkinan {formatRupiah(panenMinggu.bawah)} – {formatRupiah(panenMinggu.atas)}
                </p>
              )}
              <ArahHarga prediksi={data} />
              <div>
                <BadgeSaran prediksi={data} />
              </div>
            </div>
            <PenjelasanHarga tglPanen={tglPanen} />
          </section>

          <div className="flex flex-col gap-6">
            {/* PRD 5.1: info harga cukup satu kalimat, grafik disembunyikan di "Lihat detail". */}
            <details className="group rounded-3xl bg-kartu p-5 shadow-sm md:p-6">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3">
                <span>
                  <span className="block font-serif text-xl">Lihat detail grafik</span>
                  <span className="block text-sm text-redup">Harga 6 bulan terakhir dan perkiraan 4 minggu ke depan</span>
                </span>
                <Ikon nama="panah" className="size-5 text-daun transition group-open:rotate-90" />
              </summary>
              <div className="mt-4 flex flex-col gap-4">
                <GrafikHarga prediksi={data} />
                <p className="text-xs leading-relaxed text-redup">
                  Sumber: {data.sumber_data}. Data sampai {tanggalPanjang(data.data_sampai)}. Harga petani diperkirakan dari
                  harga grosir × {data.rasio_petani.toLocaleString("id-ID")} (rata-rata 90 hari).
                  {data.simulasi && <strong className="font-semibold"> Data simulasi.</strong>}
                </p>
              </div>
            </details>

            <section aria-labelledby="judul-surplus" className="flex flex-col gap-2 rounded-3xl bg-cabai-muda/70 p-5 md:p-6">
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cabai text-kartu">
                  <Ikon nama="api" />
                </span>
                <div>
                  <h2 id="judul-surplus" className="font-serif text-xl text-cabai">
                    Panen berlebih?
                  </h2>
                  <p className="text-sm text-redup">Tandai surplus dengan harga khusus, pembeli sekitar langsung diberi tahu.</p>
                </div>
              </div>
              {panen.galat ? (
                <Galat pesan={panen.galat} ulangi={panen.muatUlang} />
              ) : aktif.length ? (
                <ul className="divide-y divide-cabai/15">
                  {aktif.slice(0, 5).map((l) => (
                    <BarisSurplus
                      key={l.id}
                      id={l.id}
                      komoditasId={l.komoditas_id}
                      sisa={l.sisa_kg}
                      tgl={l.tgl_panen}
                      surplus={l.is_surplus}
                    />
                  ))}
                </ul>
              ) : (
                <p className="pt-2 text-base">
                  Belum ada panen yang bisa ditandai.{" "}
                  <Link href="/penjual/panen/baru" className="font-semibold text-daun underline">
                    Tambah panen
                  </Link>
                </p>
              )}
            </section>
          </div>
        </div>
      )}
    </>
  );
}
