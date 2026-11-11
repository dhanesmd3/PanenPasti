"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import type { Listing } from "@/types";
import { Button } from "@/components/ui/Button";
import { Ikon } from "@/components/ui/Ikon";
import { Galat, Kosong, Memuat } from "@/components/ui/Keadaan";
import { JudulHalaman, TautanKembali } from "@/components/penjual/bersama";
import { ambilSatuPanen, pesanGalatDb } from "@/components/penjual/data";
import { FormPanen } from "@/components/penjual/FormPanen";
import { formatKg } from "@/lib/format";
import { useMuat } from "@/lib/klien";
import { buatSupabaseBrowser } from "@/lib/supabase/client";
import { hariIniWib } from "@/lib/tanggal";

/** Hapus panen, atau tutup (tandai habis) kalau sudah ada pesanan yang tidak boleh hilang. */
function ZonaHapus({ listing, setelah }: { listing: Listing; setelah: () => void }) {
  const router = useRouter();
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const terpesan = listing.jumlah_kg - listing.sisa_kg;
  const ditutup = listing.status === "habis" && listing.sisa_kg > 0;

  async function jalankan(aksi: "hapus" | "tutup" | "buka") {
    const tanya = {
      hapus: "Hapus panen ini? Pembeli tidak akan melihatnya lagi.",
      tutup: "Tutup panen ini? Pesanan yang sudah ada tetap berjalan, tapi pembeli tidak bisa pesan lagi.",
      buka: "Buka lagi panen ini supaya pembeli bisa pre-order?",
    }[aksi];
    if (!window.confirm(tanya)) return;
    setProses(true);
    setGalat(null);
    const supabase = buatSupabaseBrowser();
    const { error } =
      aksi === "hapus"
        ? await supabase.from("listings").delete().eq("id", listing.id)
        : await supabase
            .from("listings")
            .update({
              status: aksi === "tutup" ? "habis" : listing.tgl_panen <= hariIniWib() ? "siap" : "estimasi",
            })
            .eq("id", listing.id);
    if (error) {
      setGalat(pesanGalatDb(error));
      setProses(false);
      return;
    }
    if (aksi === "hapus") router.push("/penjual/panen");
    else {
      setProses(false);
      setelah();
    }
  }

  return (
    <section aria-labelledby="judul-zona" className="flex flex-col gap-3 rounded-2xl bg-kartu/60 p-4 ring-1 ring-garis md:p-5">
      <h2 id="judul-zona" className="font-serif text-lg">
        {ditutup ? "Panen ini sedang ditutup" : "Tidak jadi menjual panen ini?"}
      </h2>
      <p className="text-sm text-redup">
        {ditutup
          ? "Pembeli tidak bisa pre-order panen ini. Buka lagi kalau stoknya masih ada."
          : terpesan > 0
            ? `Sudah dipesan ${formatKg(terpesan)}, jadi panen ini tidak bisa dihapus. Tutup saja supaya tidak ada pesanan baru.`
            : "Panen yang belum dipesan bisa dihapus."}
      </p>
      <div className="flex flex-wrap gap-2">
        {ditutup ? (
          <Button varian="kedua" disabled={proses} onClick={() => jalankan("buka")}>
            Buka lagi
          </Button>
        ) : terpesan > 0 ? (
          <Button varian="bahaya" disabled={proses} onClick={() => jalankan("tutup")}>
            Tutup panen
          </Button>
        ) : (
          <Button varian="bahaya" disabled={proses} onClick={() => jalankan("hapus")}>
            <Ikon nama="sampah" className="size-4" /> Hapus panen
          </Button>
        )}
      </div>
      {galat && <Galat pesan={galat} />}
    </section>
  );
}

export default function Page() {
  const { id } = useParams<{ id: string }>();
  const { data, galat, memuat, muatUlang } = useMuat(() => ambilSatuPanen(id), [id]);
  const kembali = <TautanKembali href="/penjual/panen">Panen Saya</TautanKembali>;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      {kembali}
      {memuat && !data ? (
        <Memuat />
      ) : galat ? (
        <Galat pesan={galat} ulangi={muatUlang} />
      ) : !data ? (
        <Kosong judul="Panen tidak ditemukan">Mungkin sudah dihapus.</Kosong>
      ) : (
        <>
          <JudulHalaman judul="Ubah panen" sub="Perubahan langsung terlihat oleh pembeli." />
          {/* key: form diisi ulang dari data terbaru setelah panen dibuka/ditutup. */}
          <FormPanen key={`${data.id}-${data.status}`} listing={data} />
          <ZonaHapus listing={data} setelah={muatUlang} />
        </>
      )}
    </div>
  );
}
