"use client";

// Tur sorotan di landing untuk pengunjung yang belum daftar: menjelaskan
// PanenPasti untuk siapa dan cara kerjanya, lalu mengarahkan ke Daftar.
// Muncul sendiri pada kunjungan pertama di perangkat ini, bisa dilewati, dan
// bisa diulang lewat tombol "Lihat cara pakai".

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Tur, type LangkahTur } from "@/components/Tur";
import { Ikon } from "@/components/ui/Ikon";
import { bacaSimpanan, tulisSimpanan } from "@/lib/simpanan";

const KUNCI = "pp:tur-tamu-selesai";
/** Beri waktu halaman tampil dulu sebelum tur muncul. */
const TUNDA_MS = 900;

const LANGKAH: LangkahTur[] = [
  {
    judul: "Baru di PanenPasti?",
    teks: "Kami tunjukkan cara kerjanya dalam beberapa langkah singkat. Bisa dilewati kapan saja.",
  },
  {
    target: '[data-tur="sisi-penjual"]',
    judul: "Untuk petani dan koperasi",
    teks: "Catat panen sebelum dipanen dan tentukan harganya sendiri. Warung memesan lebih awal, jadi pembelinya sudah pasti.",
  },
  {
    target: '[data-tur="sisi-pembeli"]',
    judul: "Untuk warung, resto, dan katering",
    teks: "Pesan bahan baku jauh hari langsung dari petani. Harganya jelas dan bisa dibandingkan dengan harga pasar.",
  },
  {
    target: '[data-tur="cara-kerja"]',
    judul: "Cara kerjanya",
    teks: "Petani mencatat panen, warung menulis kebutuhan, lalu keduanya dicocokkan otomatis menurut tanggal, jumlah, dan jarak.",
  },
  {
    target: 'header a[href="/daftar"]',
    judul: "Mulai dari sini",
    teks: "Tekan Daftar, lalu pilih Penjual atau Pembeli. Gratis. Setelah masuk, kami tunjukkan tombol-tombolnya satu per satu.",
  },
];

export function TurTamu() {
  const router = useRouter();
  const [aktif, setAktif] = useState(false);

  useEffect(() => {
    if (bacaSimpanan("lokal", KUNCI)) return;
    const timer = setTimeout(() => setAktif(true), TUNDA_MS);
    return () => clearTimeout(timer);
  }, []);

  function selesai(tuntas: boolean) {
    tulisSimpanan("lokal", KUNCI, "1");
    setAktif(false);
    if (tuntas) router.push("/daftar");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAktif(true)}
        className="label-cetak animasi-muncul mt-4 flex min-h-11 items-center gap-2 rounded-full px-4 text-sm text-kartu underline-offset-4 transition [animation-delay:320ms] hover:bg-kartu/15 hover:underline"
      >
        <Ikon nama="putar" /> Lihat cara pakai
      </button>
      {aktif && <Tur langkah={LANGKAH} onSelesai={selesai} labelAkhir="Daftar sekarang" />}
    </>
  );
}
