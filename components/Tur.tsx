"use client";

// Tur sorotan: menyorot satu elemen halaman, menjelaskan gunanya di kartu kecil
// berpanah, lalu pindah dengan Lanjut / Kembali. Bisa dilewati kapan saja.
// Langkah yang elemennya tidak ada di halaman (atau sedang tersembunyi, mis.
// menu atas di layar HP) dilompati.

import { useEffect, useEffectEvent, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Ikon } from "@/components/ui/Ikon";

export interface LangkahTur {
  /** Selector CSS elemen yang disorot. Tanpa target: kartu di tengah layar. */
  target?: string;
  judul: string;
  teks: string;
  /** Tombol tambahan di kartu, mis. "Tonton video". */
  aksi?: { label: string; onClick: () => void };
}

interface Kotak {
  atas: number;
  kiri: number;
  lebar: number;
  tinggi: number;
  vw: number;
  vh: number;
}

interface Tampilan {
  i: number;
  kotak: Kotak | null;
  /** Sorotan bergeser halus dari posisi sebelumnya (dimatikan saat halaman ikut digulir). */
  halus: boolean;
}

/** Jarak bingkai sorotan dari elemen. */
const JARAK = 8;
/** Tinggi header yang menempel di atas (header + kotak cari di HP). */
const ATAS = 136;
/** Ruang minimal untuk kartu di atas atau di bawah elemen. */
const RUANG_KARTU = 240;
const COBA_MAKS = 6;

/** Elemen pertama yang cocok dan benar-benar terlihat (bukan display:none). */
function elemenTampak(selector: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(selector)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

function ukur(el: HTMLElement): Kotak {
  const r = el.getBoundingClientRect();
  return {
    atas: r.top,
    kiri: r.left,
    lebar: r.width,
    tinggi: r.height,
    vw: document.documentElement.clientWidth,
    vh: window.innerHeight,
  };
}

const sama = (a: Kotak, b: Kotak) =>
  (Object.keys(a) as (keyof Kotak)[]).every((k) => Math.abs(a[k] - b[k]) < 0.5);

/** Header dan menu bawah selalu terlihat, jadi tidak perlu digulir. */
function menempel(el: HTMLElement): boolean {
  for (let e: HTMLElement | null = el; e && e !== document.body; e = e.parentElement) {
    const posisi = getComputedStyle(e).position;
    if (posisi === "fixed" || posisi === "sticky") return true;
  }
  return false;
}

/** Gulir halaman supaya elemen terlihat dan masih ada ruang untuk kartu. True jika menggulir. */
function gulirKe(el: HTMLElement): boolean {
  if (menempel(el)) return false;
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight;
  if (r.top >= ATAS && r.bottom <= vh - RUANG_KARTU) return false;
  // Elemen tinggi dirapatkan ke atas supaya kartu muat di bawahnya; yang kecil ke tengah.
  const tujuan = r.height > vh * 0.45 ? ATAS : Math.max(ATAS, (vh - r.height) / 2);
  const kurangiGerak = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollBy({ top: r.top - tujuan, behavior: kurangiGerak ? "auto" : "smooth" });
  return true;
}

/** Posisi kartu: di bawah elemen kalau muat, kalau tidak di atasnya, dengan panah ke elemen. */
function letak(k: Kotak): { bungkus: CSSProperties; panah: CSSProperties | null; tinggiMaks: number } {
  const lebar = Math.min(384, k.vw - 24);
  const tengah = k.kiri + k.lebar / 2;
  const kiri = Math.min(Math.max(tengah - lebar / 2, 12), k.vw - lebar - 12);
  const ruangBawah = k.vh - (k.atas + k.tinggi) - JARAK;
  const ruangAtas = k.atas - JARAK;

  if (Math.max(ruangBawah, ruangAtas) < RUANG_KARTU) {
    // Elemen hampir memenuhi layar: kartu menumpang di bagian bawah layar.
    return { bungkus: { left: kiri, width: lebar, bottom: 16 }, panah: null, tinggiMaks: k.vh * 0.6 };
  }
  const geser = Math.min(Math.max(tengah - kiri - 8, 24), lebar - 40);
  return ruangBawah >= RUANG_KARTU || ruangBawah >= ruangAtas
    ? {
        bungkus: { left: kiri, width: lebar, top: k.atas + k.tinggi + JARAK + 14 },
        panah: { left: geser, top: -7 },
        tinggiMaks: ruangBawah - 30,
      }
    : {
        bungkus: { left: kiri, width: lebar, bottom: k.vh - k.atas + JARAK + 14 },
        panah: { left: geser, bottom: -7 },
        tinggiMaks: ruangAtas - 30,
      };
}

export function Tur({
  langkah,
  onSelesai,
  labelAkhir = "Selesai",
}: {
  langkah: LangkahTur[];
  /** `tuntas` true jika sampai tombol terakhir, false jika dilewati. */
  onSelesai: (tuntas: boolean) => void;
  labelAkhir?: string;
}) {
  const [tampil, setTampil] = useState<Tampilan | null>(null);
  const elemen = useRef<HTMLElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const kartu = useRef<HTMLDivElement>(null);

  function ke(i: number, arah: 1 | -1, coba = 0) {
    clearTimeout(timer.current);
    if (i >= langkah.length) return onSelesai(true);
    if (i < 0) return;
    const { target } = langkah[i];
    if (!target) {
      elemen.current = null;
      return setTampil({ i, kotak: null, halus: false });
    }
    const el = elemenTampak(target);
    if (!el) {
      // Elemen mungkin masih dimuat (data dari server). Tunggu sebentar, lalu lompati.
      if (coba < COBA_MAKS) timer.current = setTimeout(() => ke(i, arah, coba + 1), 120);
      else ke(i + arah, arah);
      return;
    }
    elemen.current = el;
    const digulir = gulirKe(el);
    setTampil({ i, kotak: ukur(el), halus: !digulir });
  }

  const mulai = useEffectEvent(() => ke(0, 1));

  // Ikuti elemen saat halaman digulir, layar diputar, atau isi di atasnya baru termuat.
  const ukurUlang = useEffectEvent(() => {
    const el = elemen.current;
    if (!el || !tampil) return;
    const k = ukur(el);
    if (k.lebar === 0 || k.tinggi === 0) return ke(tampil.i, 1);
    if (!tampil.kotak || !sama(tampil.kotak, k)) setTampil({ ...tampil, kotak: k });
  });

  useEffect(() => {
    const fokusSebelumnya = document.activeElement as HTMLElement | null;
    const bingkai = requestAnimationFrame(mulai);
    const jalan = () => ukurUlang();
    window.addEventListener("resize", jalan);
    window.addEventListener("scroll", jalan, true);
    const selang = setInterval(jalan, 300);
    return () => {
      cancelAnimationFrame(bingkai);
      clearTimeout(timer.current);
      clearInterval(selang);
      window.removeEventListener("resize", jalan);
      window.removeEventListener("scroll", jalan, true);
      fokusSebelumnya?.focus?.({ preventScroll: true });
    };
  }, []);

  const indeks = tampil?.i;
  useEffect(() => {
    if (indeks !== undefined) kartu.current?.focus({ preventScroll: true });
  }, [indeks]);

  function tekan(e: KeyboardEvent<HTMLDivElement>) {
    if (!tampil) return;
    if (e.key === "Escape") {
      e.preventDefault();
      onSelesai(false);
    } else if (e.key === "ArrowRight" && tampil.i < langkah.length - 1) {
      ke(tampil.i + 1, 1);
    } else if (e.key === "ArrowLeft") {
      ke(tampil.i - 1, -1);
    } else if (e.key === "Tab") {
      // Fokus berputar di dalam kartu, tidak lari ke halaman di belakangnya.
      const tombol = [...e.currentTarget.querySelectorAll<HTMLElement>("button")];
      const aktif = document.activeElement;
      if (e.shiftKey && (aktif === tombol[0] || aktif === e.currentTarget)) {
        e.preventDefault();
        tombol.at(-1)?.focus();
      } else if (!e.shiftKey && aktif === tombol.at(-1)) {
        e.preventDefault();
        tombol[0]?.focus();
      }
    }
  }

  const k = tampil?.kotak ?? null;
  const l = tampil ? langkah[tampil.i] : null;
  const posisi = k ? letak(k) : null;
  const terakhir = tampil?.i === langkah.length - 1;

  return createPortal(
    <div className="fixed inset-0 z-50">
      {/* Menahan klik ke halaman selama tur. Gelapnya dari bayangan sorotan kalau ada. */}
      <div
        className={`absolute inset-0 ${k ? "" : "bg-teks/60"}`}
        onMouseDown={(e) => e.preventDefault()}
      />
      {k && (
        <div
          aria-hidden
          className={`pointer-events-none absolute rounded-2xl ${tampil?.halus ? "transition-all duration-300" : ""}`}
          style={{
            top: k.atas - JARAK,
            left: k.kiri - JARAK,
            width: k.lebar + JARAK * 2,
            height: k.tinggi + JARAK * 2,
            boxShadow: "0 0 0 200vmax rgb(87 61 33 / 0.62)",
            outline: "3px solid var(--color-terakota)",
          }}
        />
      )}
      {tampil && l && (
        <div
          className={`pointer-events-none absolute ${posisi ? "" : "inset-0 flex items-center justify-center p-3"}`}
          style={posisi?.bungkus}
        >
          <div
            key={tampil.i}
            ref={kartu}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tur-judul"
            aria-describedby="tur-teks"
            tabIndex={-1}
            onKeyDown={tekan}
            className={`animasi-muncul pointer-events-auto relative rounded-3xl bg-kartu text-teks shadow-md ${
              posisi ? "w-full" : "w-full max-w-sm"
            }`}
            style={{ outline: "none" }}
          >
            {posisi?.panah && (
              <span aria-hidden className="absolute size-4 rotate-45 rounded-[3px] bg-kartu" style={posisi.panah} />
            )}
            <div
              className="relative flex flex-col gap-3 overflow-y-auto p-5"
              style={{ maxHeight: posisi ? posisi.tinggiMaks : "80dvh" }}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="label-cetak text-sm text-redup">
                  {tampil.i + 1} dari {langkah.length}
                </p>
                <button
                  type="button"
                  onClick={() => onSelesai(false)}
                  className="label-cetak -my-2 -mr-2 flex min-h-11 items-center gap-1 rounded-full px-3 text-sm text-redup transition hover:bg-pasir/60 hover:text-teks"
                >
                  {terakhir ? "Tutup" : "Lewati"} <Ikon nama="silang" className="size-4" />
                </button>
              </div>
              <h2 id="tur-judul" className="font-serif text-2xl leading-tight">
                {l.judul}
              </h2>
              <p id="tur-teks" className="text-base leading-relaxed text-redup">
                {l.teks}
              </p>
              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                {l.aksi && (
                  <Button varian="kedua" onClick={l.aksi.onClick} className="mr-auto">
                    {l.aksi.label}
                  </Button>
                )}
                {tampil.i > 0 && (
                  <Button varian="kedua" onClick={() => ke(tampil.i - 1, -1)}>
                    Kembali
                  </Button>
                )}
                <Button onClick={() => ke(tampil.i + 1, 1)}>
                  {terakhir ? labelAkhir : tampil.i === 0 ? "Mulai" : "Lanjut"}
                  {!terakhir && <Ikon nama="panah" className="size-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
