"use client";

import { useState } from "react";
import { Field, kelasInput } from "@/components/ui/Input";
import { Galat, Kosong, MemuatGrid } from "@/components/ui/Keadaan";
import { ambilListingMendatang, hargaBerlaku, KartuListing, KELAS_GRID_PRODUK } from "@/components/pembeli/listing";
import { useKecamatan, useKomoditas, useMuat } from "@/lib/klien";
import { hariIniWib, tambahHari } from "@/lib/tanggal";

const URUTAN = {
  panen: "Panen terdekat",
  murah: "Harga termurah",
  stok: "Stok terbanyak",
} as const;

export default function Page() {
  const hariIni = hariIniWib();
  const [komoditasId, setKomoditasId] = useState("");
  const [dari, setDari] = useState(hariIni);
  const [sampai, setSampai] = useState(tambahHari(hariIni, 60));
  const [kecId, setKecId] = useState("");
  const [urut, setUrut] = useState<keyof typeof URUTAN>("panen");
  const kecamatan = useKecamatan();
  const komoditas = useKomoditas();

  const { data, galat, memuat, muatUlang } = useMuat(
    () => ambilListingMendatang({ komoditasId: Number(komoditasId) || undefined, dari, sampai }),
    [komoditasId, dari, sampai],
  );

  // shortcut: filter kecamatan & urutan dilakukan di browser (maks 200 listing), pindah ke query kalau listing bertambah banyak.
  const tampil = (data ?? [])
    .filter((d) => !kecId || String(d.penjual?.kecamatan_id) === kecId)
    .sort((a, b) =>
      urut === "murah"
        ? hargaBerlaku(a.listing) - hargaBerlaku(b.listing)
        : urut === "stok"
          ? b.listing.sisa_kg - a.listing.sisa_kg
          : 0,
    );
  const kecamatanPenjual = [...new Set((data ?? []).map((d) => d.penjual?.kecamatan_id))]
    .map((id) => (id == null ? undefined : kecamatan.get(id)))
    .filter((k) => k !== undefined)
    .sort((a, b) => a.nama.localeCompare(b.nama));

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-3xl md:text-4xl">Katalog Musiman</h1>
        <p className="text-redup">Hasil panen yang akan datang. Pesan sekarang, diambil saat panen.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="grid grid-cols-2 gap-4 rounded-2xl bg-kartu p-5 shadow-sm lg:grid-cols-1">
            <p className="col-span-2 font-serif text-lg lg:col-span-1">Saring</p>
            <div className="col-span-2 lg:col-span-1">
              <Field label="Komoditas" htmlFor="komoditas">
                <select
                  id="komoditas"
                  value={komoditasId}
                  onChange={(e) => setKomoditasId(e.target.value)}
                  className={kelasInput}
                >
                  <option value="">Semua komoditas</option>
                  {[...komoditas.values()].map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Panen dari" htmlFor="dari">
              <input id="dari" type="date" value={dari} onChange={(e) => setDari(e.target.value)} className={kelasInput} />
            </Field>
            <Field label="Sampai" htmlFor="sampai">
              <input
                id="sampai"
                type="date"
                value={sampai}
                onChange={(e) => setSampai(e.target.value)}
                className={kelasInput}
              />
            </Field>
            <div className="col-span-2 lg:col-span-1">
              <Field label="Kecamatan penjual" htmlFor="kec">
                <select id="kec" value={kecId} onChange={(e) => setKecId(e.target.value)} className={kelasInput}>
                  <option value="">Semua kecamatan</option>
                  {kecamatanPenjual.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        </aside>

        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-redup">{memuat ? "Memuat…" : `${tampil.length} panen ditemukan`}</p>
            <label className="flex items-center gap-2 text-sm text-redup">
              Urutkan
              <select
                value={urut}
                onChange={(e) => setUrut(e.target.value as keyof typeof URUTAN)}
                className="h-10 rounded-full border border-garis bg-kartu px-4 text-sm text-teks focus:ring-4 focus:ring-terakota/25 focus:outline-none"
              >
                {Object.entries(URUTAN).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {memuat ? (
            <MemuatGrid className={KELAS_GRID_PRODUK} />
          ) : galat ? (
            <Galat pesan={galat} ulangi={muatUlang} />
          ) : tampil.length === 0 ? (
            <Kosong judul="Belum ada panen di rentang ini">Coba perlebar rentang tanggal atau pilih semua kecamatan.</Kosong>
          ) : (
            <ul className={KELAS_GRID_PRODUK.replace("xl:grid-cols-5", "xl:grid-cols-4")}>
              {tampil.map((d) => (
                <li key={d.listing.id}>
                  <KartuListing data={d} kecamatan={d.penjual ? kecamatan.get(d.penjual.kecamatan_id) : undefined} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
