"use client";

// Grafik harga 26 minggu terakhir + perkiraan 4 minggu ke depan (F6).
// SVG buatan sendiri (tanpa library), warna dari token lewat kelas Tailwind.
// Lebar viewBox mengikuti lebar asli supaya teks sumbu tetap 12px di HP.

import { useEffect, useRef, useState } from "react";
import type { Prediksi } from "@/types";
import { formatRupiah } from "@/lib/format";
import { keNomorHari, tanggalPendek } from "@/lib/tanggal";

const T = 260;
const KIRI = 52;
const KANAN = 16;
const ATAS = 20;
const BAWAH = 34;

const NAMA_BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** Garis putus menjadi beberapa ruas kalau ada minggu tanpa data. */
function ruas(titik: ([number, number] | null)[], tangga = false): string {
  let d = "";
  let sebelumnya: [number, number] | null = null;
  for (const t of titik) {
    if (!t) {
      sebelumnya = null;
      continue;
    }
    if (!sebelumnya) d += `M${t[0].toFixed(1)} ${t[1].toFixed(1)}`;
    else if (tangga) d += `H${t[0].toFixed(1)}V${t[1].toFixed(1)}`;
    else d += `L${t[0].toFixed(1)} ${t[1].toFixed(1)}`;
    sebelumnya = t;
  }
  return d;
}

export function GrafikHarga({ prediksi }: { prediksi: Prediksi }) {
  const wadah = useRef<HTMLDivElement>(null);
  const [L, setL] = useState(640);
  useEffect(() => {
    const el = wadah.current;
    if (!el) return;
    const amati = new ResizeObserver(([e]) => setL(Math.max(280, Math.round(e.contentRect.width))));
    amati.observe(el);
    return () => amati.disconnect();
  }, []);

  const { historis, prediksi_petani: maju, harga_terakhir, minggu_panen } = prediksi;
  const semuaTanggal = [...historis.map((h) => h.tanggal), ...maju.map((p) => p.tanggal)];
  const hari0 = keNomorHari(semuaTanggal[0]);
  const hari1 = keNomorHari(semuaTanggal.at(-1)!);

  const nilai = [
    ...historis.flatMap((h) => [h.grosir_bandung, h.petani_garut]),
    ...maju.flatMap((p) => [p.bawah, p.atas]),
  ].filter((n): n is number => n != null);
  const langkah = 20_000;
  const min = Math.max(0, Math.floor(Math.min(...nilai) / langkah) * langkah);
  const maks = Math.ceil(Math.max(...nilai) / langkah) * langkah;

  const x = (tgl: string) => KIRI + ((keNomorHari(tgl) - hari0) / (hari1 - hari0)) * (L - KIRI - KANAN);
  const y = (n: number) => ATAS + (1 - (n - min) / (maks - min)) * (T - ATAS - BAWAH);

  const garisY = Array.from({ length: (maks - min) / langkah + 1 }, (_, i) => min + i * langkah);
  // Label bulan di minggu pertama setiap bulan.
  const labelBulan = semuaTanggal.filter((t, i) => i === 0 || t.slice(5, 7) !== semuaTanggal[i - 1].slice(5, 7)).slice(1);

  const akhirHistoris = historis.at(-1)!.tanggal;
  const titikAwalMaju: [number, number] = [x(akhirHistoris), y(harga_terakhir.petani_perkiraan)];
  const pita =
    `M${titikAwalMaju[0]} ${titikAwalMaju[1]}` +
    maju.map((p) => `L${x(p.tanggal).toFixed(1)} ${y(p.atas).toFixed(1)}`).join("") +
    [...maju].reverse().map((p) => `L${x(p.tanggal).toFixed(1)} ${y(p.bawah).toFixed(1)}`).join("") +
    "Z";
  const garisMaju = ruas([titikAwalMaju, ...maju.map((p) => [x(p.tanggal), y(p.nilai)] as [number, number])]);
  const xPanen = x(minggu_panen);
  const panen = maju.find((p) => p.tanggal === minggu_panen);

  return (
    <figure className="flex flex-col gap-3">
      <div ref={wadah} className="w-full">
      <svg
        viewBox={`0 0 ${L} ${T}`}
        role="img"
        aria-label={`Grafik harga cabai rawit. Perkiraan harga di petani untuk minggu panen ${tanggalPendek(minggu_panen)} sekitar ${formatRupiah(panen?.nilai ?? harga_terakhir.petani_perkiraan)} per kg.`}
        className="h-auto w-full overflow-visible font-narrow"
      >
        {garisY.map((n) => (
          <g key={n}>
            <line x1={KIRI} x2={L - KANAN} y1={y(n)} y2={y(n)} className="stroke-garis" strokeWidth={1} />
            <text x={KIRI - 8} y={y(n) + 4} textAnchor="end" className="fill-redup text-[12px]">
              {n / 1000}rb
            </text>
          </g>
        ))}
        {labelBulan.map((t) => (
          <text key={t} x={x(t)} y={T - 10} textAnchor="middle" className="fill-redup text-[12px]">
            {NAMA_BULAN[Number(t.slice(5, 7)) - 1]}
          </text>
        ))}

        {/* Wilayah perkiraan */}
        <rect
          x={x(akhirHistoris)}
          y={ATAS}
          width={L - KANAN - x(akhirHistoris)}
          height={T - ATAS - BAWAH}
          className="fill-pasir/40"
        />
        <path d={pita} className="fill-terakota/30" />

        <path
          d={ruas(historis.map((h) => (h.grosir_bandung == null ? null : [x(h.tanggal), y(h.grosir_bandung)])))}
          className="stroke-redup/45"
          strokeWidth={2}
          fill="none"
          strokeLinejoin="round"
        />
        <path
          d={ruas(
            historis.map((h) => (h.petani_garut == null ? null : [x(h.tanggal), y(h.petani_garut)])),
            true,
          )}
          className="stroke-daun"
          strokeWidth={3}
          fill="none"
          strokeLinejoin="round"
        />
        <path
          d={garisMaju}
          className="stroke-cabai"
          strokeWidth={3}
          strokeDasharray="7 6"
          strokeLinecap="round"
          fill="none"
        />

        <line x1={xPanen} x2={xPanen} y1={ATAS} y2={T - BAWAH} className="stroke-teks" strokeWidth={1.5} />
        <text x={xPanen} y={ATAS - 6} textAnchor="middle" className="fill-teks text-[12px] font-semibold uppercase">
          Panen
        </text>
        {panen && <circle cx={xPanen} cy={y(panen.nilai)} r={5} className="fill-cabai stroke-kartu" strokeWidth={2} />}
      </svg>
      </div>

      <figcaption className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-redup">
        <span className="flex items-center gap-2">
          <span aria-hidden className="h-[3px] w-5 rounded-full bg-daun" /> Harga petani Garut
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden className="h-[3px] w-5 rounded-full border-t-[3px] border-dashed border-cabai" /> Perkiraan
          harga petani
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden className="h-3 w-5 rounded-sm bg-terakota/30" /> Rentang perkiraan
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden className="h-[2px] w-5 rounded-full bg-redup/45" /> Grosir Kota Bandung
        </span>
      </figcaption>

      {/* sr-only di pembungkus: <table> tidak patuh pada width 1px dan bisa melebarkan halaman. */}
      <div className="sr-only">
      <table>
        <caption>Perkiraan harga cabai rawit di tingkat petani, per minggu</caption>
        <thead>
          <tr>
            <th>Minggu</th>
            <th>Perkiraan</th>
            <th>Rentang</th>
          </tr>
        </thead>
        <tbody>
          {maju.map((p) => (
            <tr key={p.tanggal}>
              <td>{tanggalPendek(p.tanggal)}</td>
              <td>{formatRupiah(p.nilai)}</td>
              <td>
                {formatRupiah(p.bawah)} sampai {formatRupiah(p.atas)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </figure>
  );
}
