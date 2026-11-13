"use client";

// Overlay tutorial berisi video, muncul sekali setelah daftar atau masuk.
// Bisa ditutup (tombol ×, Esc, klik di luar kotak, atau "Mulai pakai") dan
// dibuka lagi lewat tombol "Panduan" di header.
//
// Video diatur lewat env NEXT_PUBLIC_VIDEO_TUTORIAL_PENJUAL / _PEMBELI:
// URL YouTube, atau path file di public/ (mis. /tutorial-pembeli.mp4).

import { useEffect, useRef, useState } from "react";
import type { Peran } from "@/types";
import { Button } from "@/components/ui/Button";
import { Ikon } from "@/components/ui/Ikon";
import { sumberVideo } from "@/lib/video";

const KUNCI_SESI = "pp:tutorial";
const kunciSembunyi = (peran: Peran) => `pp:tutorial-sembunyi:${peran}`;

// Ditulis lengkap supaya Next menyisipkan nilainya saat build.
const VIDEO: Record<Peran, string | undefined> = {
  penjual: process.env.NEXT_PUBLIC_VIDEO_TUTORIAL_PENJUAL,
  pembeli: process.env.NEXT_PUBLIC_VIDEO_TUTORIAL_PEMBELI,
};

const LANGKAH: Record<Peran, { judul: string; teks: string }[]> = {
  penjual: [
    { judul: "Catat panen", teks: "Buka menu Panen, tekan Tambah panen, isi perkiraan jumlah, tanggal, dan harga." },
    { judul: "Terima pesanan", teks: "Pembeli memesan sebelum panen. Konfirmasi pesanan di menu Pesanan." },
    { judul: "Cek harga", teks: "Menu Harga menunjukkan perkiraan harga supaya Anda tahu kapan sebaiknya menjual." },
  ],
  pembeli: [
    { judul: "Cari pemasok", teks: "Tulis kebutuhan Anda, mis. \"20 kg cabai rawit tiap Senin\". Penjual yang cocok muncul otomatis." },
    { judul: "Bandingkan harga", teks: "Lihat harga acuan pasar di Beranda dan bandingkan dengan harga petani di Katalog." },
    { judul: "Pesan sebelum panen", teks: "Atur pre-order. Nomor WhatsApp penjual muncul di Pesanan setelah dikonfirmasi." },
  ],
};

function baca(simpanan: () => Storage, kunci: string): string | null {
  try {
    return simpanan().getItem(kunci);
  } catch {
    return null;
  }
}

function tulis(simpanan: () => Storage, kunci: string, nilai: string | null) {
  try {
    if (nilai === null) simpanan().removeItem(kunci);
    else simpanan().setItem(kunci, nilai);
  } catch {
    // Penyimpanan diblokir (mode privat): tutorial tetap jalan, hanya tidak diingat.
  }
}

/**
 * Panggil tepat sebelum pindah halaman setelah login/daftar berhasil.
 * `baru` = akun baru: tutorial tampil walau sebelumnya pernah disembunyikan di perangkat ini.
 */
export function tandaiTutorial(baru = false) {
  tulis(() => sessionStorage, KUNCI_SESI, baru ? "baru" : "masuk");
}

export function Tutorial({ peran }: { peran: Peran }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [terbuka, setTerbuka] = useState(false);
  const [sembunyikan, setSembunyikan] = useState(false);
  const video = sumberVideo(VIDEO[peran]);

  useEffect(() => {
    const tanda = baca(() => sessionStorage, KUNCI_SESI);
    if (!tanda) return;
    tulis(() => sessionStorage, KUNCI_SESI, null);
    if (tanda === "baru" || !baca(() => localStorage, kunciSembunyi(peran))) {
      // Ditunda satu frame supaya tidak memicu render berantai di dalam effect.
      requestAnimationFrame(() => setTerbuka(true));
    }
  }, [peran]);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (terbuka && !d.open) d.showModal();
    if (!terbuka && d.open) d.close();
  }, [terbuka]);

  function buka() {
    setSembunyikan(!!baca(() => localStorage, kunciSembunyi(peran)));
    setTerbuka(true);
  }

  // Dipanggil juga saat dialog ditutup dengan Esc (event "close").
  function tutup() {
    tulis(() => localStorage, kunciSembunyi(peran), sembunyikan ? "1" : null);
    setTerbuka(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={buka}
        aria-label="Panduan memakai PanenPasti"
        className="label-cetak flex h-10 items-center gap-1.5 rounded-full px-2.5 text-sm text-redup transition hover:bg-pasir/60 hover:text-teks"
      >
        <Ikon nama="putar" />
        <span className="hidden sm:inline">Panduan</span>
      </button>

      <dialog
        ref={dialog}
        onClose={tutup}
        onClick={(e) => e.target === e.currentTarget && tutup()}
        aria-labelledby="judul-tutorial"
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-3xl bg-kartu p-0 text-teks shadow-md backdrop:bg-teks/60 backdrop:backdrop-blur-sm"
      >
        {/* Isi hanya dipasang saat terbuka, jadi video berhenti begitu ditutup. */}
        {terbuka && (
          <div className="flex flex-col gap-5 p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="label-cetak text-sm text-redup">Selamat datang</p>
                <h2 id="judul-tutorial" className="font-serif text-2xl leading-tight sm:text-3xl">
                  Cara pakai PanenPasti
                </h2>
              </div>
              <button
                type="button"
                onClick={tutup}
                aria-label="Tutup panduan"
                className="flex size-12 shrink-0 items-center justify-center rounded-full bg-latar text-teks transition hover:bg-pasir"
              >
                <Ikon nama="silang" className="size-6" />
              </button>
            </div>

            <div className="aspect-video overflow-hidden rounded-2xl bg-teks">
              {video?.jenis === "youtube" ? (
                <iframe
                  src={video.src}
                  title="Video panduan PanenPasti"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="size-full"
                />
              ) : video?.jenis === "file" ? (
                <video src={video.src} controls playsInline preload="metadata" className="size-full" />
              ) : (
                <div className="flex size-full flex-col items-center justify-center gap-2 bg-pasir/60 p-6 text-center text-redup">
                  <Ikon nama="putar" className="size-10" />
                  <p>Video panduan segera hadir. Ikuti tiga langkah di bawah dulu.</p>
                </div>
              )}
            </div>

            <ol className="grid gap-3 sm:grid-cols-3">
              {LANGKAH[peran].map((l, i) => (
                <li key={l.judul} className="flex gap-3 rounded-2xl bg-latar/60 p-4 sm:flex-col">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-terakota font-narrow text-lg font-bold">
                    {i + 1}
                  </span>
                  <span>
                    <span className="block font-serif text-lg leading-snug">{l.judul}</span>
                    <span className="block text-base leading-relaxed text-redup">{l.teks}</span>
                  </span>
                </li>
              ))}
            </ol>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex min-h-12 items-center gap-3 text-base">
                <input
                  type="checkbox"
                  checked={sembunyikan}
                  onChange={(e) => setSembunyikan(e.target.checked)}
                  className="size-5 accent-daun"
                />
                Jangan tampilkan lagi saat masuk
              </label>
              <Button onClick={tutup}>
                Mulai pakai <Ikon nama="panah" className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
