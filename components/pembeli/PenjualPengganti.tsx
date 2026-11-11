"use client";

import Link from "next/link";
import type { HasilMatching, PesananLengkap } from "@/types";
import { Galat, Kosong, Memuat } from "@/components/ui/Keadaan";
import { ambilJson, useKecamatan, useMuat } from "@/lib/klien";
import { hariIniWib } from "@/lib/tanggal";
import { KartuMatching } from "./KartuMatching";

/** 3 penjual pengganti teratas untuk pesanan gagal panen (PRD bagian 10), dari matching ulang. */
export function PenjualPengganti({ pesanan }: { pesanan: PesananLengkap }) {
  const kecamatan = useKecamatan();
  const hariIni = hariIniWib();
  const tglButuh = pesanan.listing.tgl_panen > hariIni ? pesanan.listing.tgl_panen : hariIni;
  const { data, galat, memuat, muatUlang } = useMuat(
    () =>
      ambilJson<{ hasil: HasilMatching[] }>("/api/match", {
        method: "POST",
        body: JSON.stringify({
          komoditas_id: pesanan.listing.komoditas_id,
          jumlah_kg: pesanan.jumlah_kg,
          tgl_butuh: tglButuh,
          kecualikan_listing: [pesanan.listing_id],
          batas: 3,
        }),
      }).then((r) => r.hasil),
    [pesanan.id],
  );

  if (memuat) return <Memuat teks="Mencari penjual pengganti…" />;
  if (galat) return <Galat pesan={galat} ulangi={muatUlang} />;
  if (!data?.length) {
    return (
      <Kosong judul="Belum ada penjual pengganti">
        Belum ada panen lain di sekitar tanggal ini.{" "}
        <Link href="/pembeli/cari" className="font-semibold text-daun underline">
          Cari dengan tanggal lain
        </Link>
      </Kosong>
    );
  }
  return (
    <ul className="grid gap-3 md:grid-cols-3">
      {data.map((h) => (
        <li key={h.listing.id}>
          <KartuMatching
            hasil={h}
            kecamatan={kecamatan.get(h.penjual.kecamatan_id)}
            jumlahKg={pesanan.jumlah_kg}
            kebutuhanId={pesanan.kebutuhan_id}
          />
        </li>
      ))}
    </ul>
  );
}
