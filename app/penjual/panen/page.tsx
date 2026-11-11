"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { kelasTombol } from "@/components/ui/Button";
import { Ikon } from "@/components/ui/Ikon";
import { Galat, Kosong, Memuat } from "@/components/ui/Keadaan";
import { JudulHalaman } from "@/components/penjual/bersama";
import { ambilPanenSaya, panenAktif } from "@/components/penjual/data";
import { KartuPanen } from "@/components/penjual/KartuPanen";
import { formatKg } from "@/lib/format";
import { useMuat } from "@/lib/klien";

const KELAS_GRID = "grid gap-4 md:grid-cols-2 xl:grid-cols-3";

export default function Page() {
  const tersimpan = useSearchParams().get("tersimpan");
  const { data, galat, memuat, muatUlang } = useMuat(ambilPanenSaya);
  const aktif = panenAktif(data ?? []);
  const selesai = (data ?? []).filter((l) => !aktif.includes(l));
  const sisaTotal = aktif.reduce((n, l) => n + l.sisa_kg, 0);

  const tombolTambah = (
    <Link href="/penjual/panen/baru" className={kelasTombol("utama")}>
      <Ikon nama="tambah" className="size-5" /> Tambah panen
    </Link>
  );

  return (
    <div className="flex flex-col gap-6 pb-20 lg:pb-0">
      <JudulHalaman
        judul="Panen Saya"
        sub={
          data && aktif.length
            ? `${aktif.length} panen bisa dipesan · sisa ${formatKg(sisaTotal)}`
            : "Catat panen Anda supaya warung bisa pre-order."
        }
        aksi={<div className="hidden lg:block">{tombolTambah}</div>}
      />

      {tersimpan && !memuat && !galat && (
        <p role="status" className="flex items-center gap-2 rounded-2xl bg-sage/80 px-4 py-3 text-base text-[#4c5a2c]">
          <Ikon nama="centang" className="size-5" /> Panen tersimpan. Pembeli sudah bisa melihatnya di katalog.
        </p>
      )}

      {memuat && !data ? (
        <Memuat teks="Memuat panen…" />
      ) : galat ? (
        <Galat pesan={galat} ulangi={muatUlang} />
      ) : !data?.length ? (
        <Kosong judul="Belum ada panen">
          <p>Catat panen pertama Anda: jumlah, perkiraan tanggal, dan harga yang Anda tentukan sendiri.</p>
          <div className="mt-4">{tombolTambah}</div>
        </Kosong>
      ) : (
        <>
          {aktif.length ? (
            <ul className={KELAS_GRID}>
              {aktif.map((l) => (
                <li key={l.id}>
                  <KartuPanen listing={l} sorot={l.id === tersimpan} />
                </li>
              ))}
            </ul>
          ) : (
            <Kosong judul="Semua panen sudah habis">Tambah panen berikutnya supaya pembeli bisa pre-order lagi.</Kosong>
          )}

          {selesai.length > 0 && (
            <details className="group flex flex-col gap-4">
              <summary className="label-cetak flex min-h-12 w-fit cursor-pointer list-none items-center gap-2 text-sm text-redup hover:text-teks">
                <Ikon nama="panah" className="size-4 transition group-open:rotate-90" />
                Sudah habis ({selesai.length})
              </summary>
              <ul className={`${KELAS_GRID} mt-4`}>
                {selesai.map((l) => (
                  <li key={l.id}>
                    <KartuPanen listing={l} sorot={l.id === tersimpan} />
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}

      {/* Tombol utama di jangkauan jempol (PRD 5.1), di atas navigasi bawah. */}
      <div className="fixed inset-x-0 bottom-16 z-10 border-t border-garis/70 bg-latar/95 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/penjual/panen/baru" className={kelasTombol("utama", true)}>
          <Ikon nama="tambah" className="size-5" /> Tambah panen
        </Link>
      </div>
    </div>
  );
}
