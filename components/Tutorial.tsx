"use client";

// Panduan untuk pengguna yang sudah masuk: tur sorotan (components/Tur.tsx)
// yang menunjuk tombol-tombol penting satu per satu. Muncul sekali setelah
// daftar atau masuk, bisa dilewati, dan bisa diulang lewat tombol "Panduan".
//
// Video bersifat tambahan: kalau env NEXT_PUBLIC_VIDEO_TUTORIAL_PENJUAL / _PEMBELI
// diisi (URL YouTube atau path file di public/), kartu pembuka tur menampilkan
// tombol "Tonton video".

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Peran } from "@/types";
import { Tur, type LangkahTur } from "@/components/Tur";
import { Ikon } from "@/components/ui/Ikon";
import { bacaSimpanan, tulisSimpanan } from "@/lib/simpanan";
import { BERANDA } from "@/lib/supabase/akses";
import { sumberVideo } from "@/lib/video";

const KUNCI_SESI = "pp:tutorial";
const kunciSelesai = (peran: Peran) => `pp:tutorial-selesai:${peran}`;

// Ditulis lengkap supaya Next menyisipkan nilainya saat build.
const VIDEO: Record<Peran, string | undefined> = {
  penjual: process.env.NEXT_PUBLIC_VIDEO_TUTORIAL_PENJUAL,
  pembeli: process.env.NEXT_PUBLIC_VIDEO_TUTORIAL_PEMBELI,
};

const menu = (peran: Peran, href: string) => `nav[aria-label="Menu ${peran}"] a[href="${href}"]`;
const LONCENG = 'header a[href="/notifikasi"]';
const AKUN = 'header button[aria-label="Menu akun"]';
const PANDUAN = '[data-tur="panduan"]';

const PEMBUKA: LangkahTur = {
  judul: "Selamat datang di PanenPasti",
  teks: "Kami tunjukkan tombol-tombol pentingnya satu per satu. Hanya sebentar, dan bisa dilewati kapan saja.",
};
const PENUTUP: LangkahTur = {
  target: PANDUAN,
  judul: "Lupa caranya?",
  teks: "Tekan Panduan kapan saja untuk melihat petunjuk ini lagi.",
};

const LANGKAH: Record<Peran, LangkahTur[]> = {
  penjual: [
    PEMBUKA,
    {
      target: 'main a[href="/penjual/panen/baru"]',
      judul: "Catat panen di sini",
      teks: "Tekan Tambah panen, lalu isi perkiraan jumlah, tanggal, dan harga Anda. Bisa juga diceritakan seperti mengetik pesan, nanti terisi sendiri.",
    },
    {
      target: menu("penjual", "/penjual/panen"),
      judul: "Panen Saya",
      teks: "Semua panen yang Anda catat ada di sini. Bisa diubah kapan saja, atau ditandai Surplus kalau panen berlebih.",
    },
    {
      target: menu("penjual", "/penjual/pesanan"),
      judul: "Pesanan dari pembeli",
      teks: "Warung memesan sebelum Anda panen. Terima atau tolak di sini. Pesanan yang tidak dijawab dalam 48 jam batal sendiri.",
    },
    {
      target: menu("penjual", "/penjual/harga"),
      judul: "Perkiraan harga",
      teks: "Lihat perkiraan harga beberapa minggu ke depan dan saran kapan sebaiknya menjual.",
    },
    {
      target: LONCENG,
      judul: "Kabar terbaru",
      teks: "Lonceng ini memberi tanda kalau ada pesanan baru atau pesanan yang berubah.",
    },
    {
      target: AKUN,
      judul: "Akun dan ukuran huruf",
      teks: "Ubah profil dan nomor WhatsApp di sini. Kalau huruf terasa kecil, buka Pengaturan lalu perbesar Ukuran teks.",
    },
    PENUTUP,
  ],
  pembeli: [
    PEMBUKA,
    {
      target: 'header form[role="search"]',
      judul: "Tulis kebutuhan Anda",
      teks: "Ketik dengan kalimat biasa, misalnya \"20 kg cabai rawit tiap Senin\". Kami carikan petani yang paling cocok.",
    },
    {
      target: '[data-tur="harga-acuan"]',
      judul: "Harga acuan pasar",
      teks: "Harga pasar per kilo saat ini. Pakai untuk membandingkan dengan harga petani sebelum memesan.",
    },
    {
      target: menu("pembeli", "/pembeli/katalog"),
      judul: "Katalog panen",
      teks: "Semua panen yang akan datang. Setiap kartu menunjukkan harganya di bawah atau di atas harga pasar.",
    },
    {
      target: menu("pembeli", "/pembeli/pesanan"),
      judul: "Pesanan Saya",
      teks: "Pantau status pre-order Anda. Setelah penjual menerima pesanan, tombol WhatsApp-nya muncul di sini.",
    },
    {
      target: LONCENG,
      judul: "Kabar terbaru",
      teks: "Lonceng ini memberi tanda kalau pesanan diterima atau dikirim, dan kalau ada panen surplus dengan harga khusus di sekitar Anda.",
    },
    {
      target: AKUN,
      judul: "Akun dan ukuran huruf",
      teks: "Ubah profil dan nomor WhatsApp di sini. Kalau huruf terasa kecil, buka Pengaturan lalu perbesar Ukuran teks.",
    },
    PENUTUP,
  ],
};

/**
 * Panggil tepat sebelum pindah halaman setelah login/daftar berhasil.
 * `baru` = akun baru: tur tampil walau pernah dilewati di perangkat ini.
 */
export function tandaiTutorial(baru = false) {
  tulisSimpanan("sesi", KUNCI_SESI, baru ? "baru" : "masuk");
}

export function Tutorial({ peran }: { peran: Peran }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [tur, setTur] = useState(false);
  const [videoTerbuka, setVideoTerbuka] = useState(false);
  const video = sumberVideo(VIDEO[peran]);

  useEffect(() => {
    const tanda = bacaSimpanan("sesi", KUNCI_SESI);
    if (!tanda) return;
    tulisSimpanan("sesi", KUNCI_SESI, null);
    if (tanda === "baru" || !bacaSimpanan("lokal", kunciSelesai(peran))) {
      // Ditunda satu frame supaya tidak memicu render berantai di dalam effect.
      requestAnimationFrame(() => setTur(true));
    }
  }, [peran]);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (videoTerbuka && !d.open) d.showModal();
    if (!videoTerbuka && d.open) d.close();
  }, [videoTerbuka]);

  function mulai() {
    // Beberapa langkah menyorot isi beranda, jadi tur selalu dimulai dari sana.
    if (window.location.pathname !== BERANDA[peran]) router.push(BERANDA[peran]);
    setTur(true);
  }

  function selesai() {
    tulisSimpanan("lokal", kunciSelesai(peran), "1");
    setTur(false);
  }

  const langkah = LANGKAH[peran].map((l, i) =>
    i === 0 && video ? { ...l, aksi: { label: "Tonton video", onClick: () => setVideoTerbuka(true) } } : l,
  );

  return (
    <>
      <button
        type="button"
        onClick={mulai}
        data-tur="panduan"
        aria-label="Panduan memakai PanenPasti"
        className="label-cetak flex h-10 items-center gap-1.5 rounded-full px-2.5 text-sm text-redup transition hover:bg-pasir/60 hover:text-teks"
      >
        <Ikon nama="putar" />
        <span className="hidden sm:inline">Panduan</span>
      </button>

      {tur && <Tur langkah={langkah} onSelesai={selesai} />}

      {video && (
        <dialog
          ref={dialog}
          onClose={() => setVideoTerbuka(false)}
          onClick={(e) => e.target === e.currentTarget && setVideoTerbuka(false)}
          aria-labelledby="judul-video-panduan"
          className="m-auto w-[calc(100%-2rem)] max-w-2xl rounded-3xl bg-kartu p-0 text-teks shadow-md backdrop:bg-teks/60 backdrop:backdrop-blur-sm"
        >
          {/* Isi hanya dipasang saat terbuka, jadi video berhenti begitu ditutup. */}
          {videoTerbuka && (
            <div className="flex flex-col gap-4 p-5 sm:p-7">
              <div className="flex items-center justify-between gap-4">
                <h2 id="judul-video-panduan" className="font-serif text-2xl leading-tight">
                  Video panduan
                </h2>
                <button
                  type="button"
                  onClick={() => setVideoTerbuka(false)}
                  aria-label="Tutup video"
                  className="flex size-12 shrink-0 items-center justify-center rounded-full bg-latar text-teks transition hover:bg-pasir"
                >
                  <Ikon nama="silang" className="size-6" />
                </button>
              </div>
              <div className="aspect-video overflow-hidden rounded-2xl bg-teks">
                {video.jenis === "youtube" ? (
                  <iframe
                    src={video.src}
                    title="Video panduan PanenPasti"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="size-full"
                  />
                ) : (
                  <video src={video.src} controls playsInline preload="metadata" className="size-full" />
                )}
              </div>
            </div>
          )}
        </dialog>
      )}
    </>
  );
}
