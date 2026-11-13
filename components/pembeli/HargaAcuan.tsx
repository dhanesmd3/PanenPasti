"use client";

// Harga acuan pasar (PIHPS) sebagai pembanding harga petani di katalog.
// Data dari GET /api/harga/acuan, di-cache per tab seperti tabel referensi.

import type { HargaAcuan } from "@/types";
import { Ikon } from "@/components/ui/Ikon";
import { bandingkanHarga } from "@/lib/harga-acuan";
import { formatRupiah } from "@/lib/format";
import { ambilJson, useKomoditas, useMuat } from "@/lib/klien";
import { tanggalPendek } from "@/lib/tanggal";

let cache: Promise<Map<number, HargaAcuan>> | null = null;

export function ambilHargaAcuan(): Promise<Map<number, HargaAcuan>> {
  return (cache ??= ambilJson<HargaAcuan[]>("/api/harga/acuan")
    .then((daftar) => new Map(daftar.map((h) => [h.komoditas_id, h])))
    .catch((e: unknown) => {
      cache = null;
      throw e;
    }));
}

/** Peta komoditas_id → harga acuan. Kosong selama memuat atau kalau gagal. */
export function useHargaAcuan(): Map<number, HargaAcuan> {
  return useMuat(ambilHargaAcuan).data ?? new Map();
}

/** Kartu di beranda pembeli: harga pasar per kg untuk setiap komoditas yang punya data. */
export function KartuHargaAcuan() {
  const { data, memuat } = useMuat(ambilHargaAcuan);
  const komoditas = useKomoditas();
  const daftar = [...(data?.values() ?? [])];
  if (memuat || daftar.length === 0) return null;

  return (
    <section aria-labelledby="judul-acuan" className="flex flex-col gap-4 rounded-2xl bg-kartu p-5 shadow-sm md:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-pasir/70 text-daun">
          <Ikon nama="grafik" />
        </span>
        <div>
          <h2 id="judul-acuan" className="font-serif text-xl md:text-2xl">
            Harga acuan pasar
          </h2>
          <p className="text-sm text-redup">Bandingkan dengan harga petani di katalog sebelum memesan.</p>
        </div>
      </div>
      <ul className="flex flex-col divide-y divide-garis/70">
        {daftar.map((h) => (
          <li key={h.komoditas_id} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-serif text-lg">{komoditas.get(h.komoditas_id)?.nama ?? "Komoditas"}</p>
            <dl className="grid grid-cols-2 gap-4 sm:flex sm:gap-8">
              <div>
                <dt className="text-sm text-redup">Pasar tradisional</dt>
                <dd className="font-narrow text-2xl font-bold">
                  {formatRupiah(h.pasar_per_kg)}
                  <span className="text-sm font-normal text-redup">/kg</span>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-redup">Grosir</dt>
                <dd className="font-narrow text-2xl font-bold">
                  {formatRupiah(h.grosir_per_kg)}
                  <span className="text-sm font-normal text-redup">/kg</span>
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
      <p className="text-xs text-redup">
        {daftar[0].wilayah}, rata-rata minggu {tanggalPendek(daftar[0].minggu)}. Sumber: {daftar[0].sumber}.
      </p>
    </section>
  );
}

const NADA = {
  lebih_murah: "bg-sage text-[#4c5a2c]",
  setara: "bg-pasir/70 text-teks",
  lebih_mahal: "bg-kunyit-muda text-kunyit",
} as const;

/**
 * Perbandingan harga per kg (harga yang dibayar pembeli) dengan harga pasar tradisional.
 * `ringkas` untuk kartu katalog, tanpa itu untuk halaman detail.
 * Tidak tampil kalau komoditasnya belum punya harga acuan.
 */
export function BandingPasar({
  komoditasId,
  harga,
  ringkas = false,
}: {
  komoditasId: number;
  harga: number;
  ringkas?: boolean;
}) {
  const acuan = useHargaAcuan().get(komoditasId);
  if (!acuan) return null;

  const b = bandingkanHarga(harga, acuan.pasar_per_kg);
  const persen = Math.round(Math.abs(b.persen) * 100);
  const label =
    b.arah === "setara"
      ? "Setara harga pasar"
      : b.arah === "lebih_murah"
        ? `${persen}% di bawah harga pasar`
        : `${persen}% di atas harga pasar`;

  if (ringkas) {
    return (
      <p className={`w-fit rounded-md px-1.5 py-0.5 text-xs font-semibold ${NADA[b.arah]}`}>{label}</p>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-kartu p-4 shadow-sm">
      <p className="flex items-center gap-2 font-serif text-lg">
        <Ikon nama="grafik" className="size-5 text-daun" /> Dibanding harga pasar
      </p>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-redup">Harga di sini</dt>
          <dd className="font-narrow text-xl font-bold">{formatRupiah(harga)}/kg</dd>
        </div>
        <div>
          <dt className="text-redup">Pasar tradisional</dt>
          <dd className="font-narrow text-xl font-bold">{formatRupiah(acuan.pasar_per_kg)}/kg</dd>
        </div>
      </dl>
      <p className={`rounded-xl px-3 py-2 text-sm ${NADA[b.arah]}`}>
        {b.arah === "setara" ? (
          "Harganya setara dengan harga pasar saat ini."
        ) : b.arah === "lebih_murah" ? (
          <>
            Lebih hemat <strong>{formatRupiah(b.selisih)}/kg</strong> ({persen}%) dari harga pasar.
          </>
        ) : (
          <>
            <strong>{formatRupiah(-b.selisih)}/kg</strong> ({persen}%) di atas harga pasar saat ini.
          </>
        )}
      </p>
      <p className="text-xs leading-relaxed text-redup">
        Harga pasar: rata-rata pasar tradisional {acuan.wilayah} minggu {tanggalPendek(acuan.minggu)} (grosir{" "}
        {formatRupiah(acuan.grosir_per_kg)}/kg). Harga saat panen bisa berbeda.
      </p>
    </div>
  );
}
