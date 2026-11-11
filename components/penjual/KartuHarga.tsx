"use client";

import Link from "next/link";
import type { Prediksi } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Ikon } from "@/components/ui/Ikon";
import { Galat } from "@/components/ui/Keadaan";
import { formatRupiah } from "@/lib/format";
import { useMuat } from "@/lib/klien";
import { tambahHari, tanggalPendek } from "@/lib/tanggal";
import { ambilPenjelasanHarga, ambilPrediksi } from "./data";

/** Senin "2026-11-09" → "9–15 Nov"; lintas bulan → "30 Nov – 6 Des". */
export function rentangMinggu(senin: string): string {
  const awal = tanggalPendek(senin);
  const akhir = tanggalPendek(tambahHari(senin, 6));
  return awal.split(" ")[1] === akhir.split(" ")[1] ? `${awal.split(" ")[0]}–${akhir}` : `${awal} – ${akhir}`;
}

/** Arah harga di minggu panen: naik/turun/stabil, dengan warna + ikon + teks. */
export function ArahHarga({ prediksi }: { prediksi: Prediksi }) {
  const persen = Math.abs(prediksi.perubahan * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 });
  const minggu = rentangMinggu(prediksi.minggu_panen);
  if (Math.abs(prediksi.perubahan) < 0.01) {
    return (
      <p className="flex items-center gap-2 text-base">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-pasir text-teks">
          <Ikon nama="panah" className="size-4" />
        </span>
        Stabil di minggu panen ({minggu})
      </p>
    );
  }
  const naik = prediksi.perubahan > 0;
  return (
    <p className="flex items-center gap-2 text-base">
      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
          naik ? "bg-sage text-[#4c5a2c]" : "bg-cabai-muda text-cabai"
        }`}
      >
        <Ikon nama={naik ? "naik" : "turun"} className="size-4" />
      </span>
      <span>
        <span className={`font-semibold ${naik ? "text-[#4c5a2c]" : "text-cabai"}`}>
          {naik ? "Naik" : "Turun"} {persen}%
        </span>{" "}
        di minggu panen ({minggu})
      </span>
    </p>
  );
}

export function BadgeSaran({ prediksi }: { prediksi: Prediksi }) {
  return prediksi.saran === "tahan" ? (
    <Badge nada="kuning" ikon="jam">
      Saran: tahan dulu
    </Badge>
  ) : (
    <Badge nada="hijau" ikon="centang">
      Saran: jual saat panen
    </Badge>
  );
}

/** Satu-dua kalimat penjelasan harga (AI-3), dengan label sumbernya. */
export function PenjelasanHarga({ tglPanen }: { tglPanen: string | null }) {
  const { data, memuat } = useMuat(() => ambilPenjelasanHarga(tglPanen), [tglPanen]);
  if (memuat) {
    return (
      <div role="status" className="flex flex-col gap-2">
        <span className="sr-only">Menyiapkan penjelasan harga…</span>
        <div className="kerangka h-4 w-full rounded-full" />
        <div className="kerangka h-4 w-4/5 rounded-full" />
      </div>
    );
  }
  // Endpoint selalu punya cadangan template; kalau tetap gagal, kartu tetap berguna tanpa kalimat ini.
  if (!data) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="font-serif text-lg leading-snug text-pretty">“{data.teks}”</p>
      <p className="flex items-center gap-1.5 text-xs text-redup">
        <Ikon nama={data.dibuat_ai ? "kilau" : "grafik"} className="size-3.5 shrink-0" />
        {data.dibuat_ai ? `Dijelaskan oleh AI dari angka prediksi · ${data.disclaimer}` : data.disclaimer}
      </p>
    </div>
  );
}

/** Kartu harga satu kalimat untuk beranda (PRD 5.1). Grafik ada di halaman Harga. */
export function KartuHargaRingkas({ tglPanen }: { tglPanen: string | null }) {
  const { data, galat, memuat, muatUlang } = useMuat(() => ambilPrediksi(tglPanen), [tglPanen]);

  return (
    <section aria-labelledby="judul-harga" className="flex flex-col gap-4 rounded-2xl bg-kartu p-5 shadow-sm md:p-6">
      <div className="flex items-start justify-between gap-3">
        <h2 id="judul-harga" className="font-serif text-xl leading-snug">
          Harga cabai rawit di petani
        </h2>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-pasir/70 text-daun">
          <Ikon nama="grafik" />
        </span>
      </div>
      {memuat ? (
        <div role="status" className="flex flex-col gap-3">
          <span className="sr-only">Memuat harga…</span>
          <div className="kerangka h-10 w-48 rounded-xl" />
          <div className="kerangka h-6 w-56 rounded-full" />
        </div>
      ) : galat || !data ? (
        <Galat pesan={galat ?? "Harga belum bisa dimuat."} ulangi={muatUlang} />
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <p className="font-narrow text-4xl font-bold">
              {formatRupiah(data.harga_terakhir.petani_perkiraan)}
              <span className="text-base font-normal text-redup">/kg sekarang</span>
            </p>
            <ArahHarga prediksi={data} />
          </div>
          <PenjelasanHarga tglPanen={tglPanen} />
        </>
      )}
      <Link
        href="/penjual/harga"
        className="label-cetak mt-auto flex min-h-11 items-center gap-1 text-sm text-daun hover:underline"
      >
        Lihat detail harga <Ikon nama="panah" className="size-4" />
      </Link>
    </section>
  );
}
