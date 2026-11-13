"use client";

import Link from "next/link";
import { useState } from "react";
import type { Notifikasi, TipeNotifikasi } from "@/types";
import { Button } from "@/components/ui/Button";
import { Ikon, type NamaIkon } from "@/components/ui/Ikon";
import { Galat, Kosong, Memuat } from "@/components/ui/Keadaan";
import { ambilJson, useMuat, usePeranSaya } from "@/lib/klien";
import { BERANDA } from "@/lib/supabase/akses";
import { tujuanNotifikasi, waktuLalu } from "@/lib/notifikasi";
import { Logo } from "@/components/ui/Logo";

const TAMPILAN: Record<TipeNotifikasi, { ikon: NamaIkon; warna: string }> = {
  pesanan_baru: { ikon: "paket", warna: "bg-sage text-[#4c5a2c]" },
  status_berubah: { ikon: "truk", warna: "bg-pasir text-teks" },
  surplus: { ikon: "api", warna: "bg-cabai-muda text-cabai" },
  pengganti_tersedia: { ikon: "orang", warna: "bg-kunyit-muda text-kunyit" },
};

export function HeaderNotifikasi() {
  const peran = usePeranSaya();
  const beranda = peran ? BERANDA[peran] : "/";
  return (
    <header className="sticky top-0 z-20 border-b border-garis/70 bg-kartu/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-3xl items-center gap-2 px-4">
        <Link
          href={beranda}
          aria-label="Kembali ke beranda"
          className="flex size-10 items-center justify-center rounded-full text-redup transition hover:bg-pasir/60 hover:text-teks"
        >
          <Ikon nama="kembali" />
        </Link>
        <Link href={beranda} className="leading-none">
          <Logo />
        </Link>
      </div>
    </header>
  );
}

export function DaftarNotifikasi() {
  const peran = usePeranSaya();
  const { data, galat, memuat, muatUlang } = useMuat(() => ambilJson<Notifikasi[]>("/api/notifikasi"));
  // Ditandai dibaca di layar lebih dulu; server menyusul di belakang.
  const [dibaca, setDibaca] = useState<Set<string>>(new Set());
  const [galatTandai, setGalatTandai] = useState<string | null>(null);

  const daftar = (data ?? []).map((n) => (dibaca.has(n.id) ? { ...n, dibaca: true } : n));
  const belum = daftar.filter((n) => !n.dibaca);

  async function tandai(ids?: string[]) {
    setGalatTandai(null);
    setDibaca((lama) => new Set([...lama, ...(ids ?? belum.map((n) => n.id))]));
    try {
      await ambilJson("/api/notifikasi", { method: "PATCH", body: JSON.stringify(ids ? { ids } : {}) });
      window.dispatchEvent(new Event("notifikasi-berubah"));
    } catch (e) {
      setGalatTandai((e as Error).message);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl">Notifikasi</h1>
          {data && (
            <p className="text-sm text-redup">
              {belum.length ? `${belum.length} belum dibaca` : "Semua sudah dibaca"}
            </p>
          )}
        </div>
        {belum.length > 0 && (
          <Button varian="kedua" onClick={() => tandai()}>
            <Ikon nama="centang" className="size-4" /> Tandai semua dibaca
          </Button>
        )}
      </div>
      {galatTandai && <Galat pesan={galatTandai} />}

      {memuat && !data ? (
        <Memuat />
      ) : galat ? (
        <Galat pesan={galat} ulangi={muatUlang} />
      ) : !daftar.length ? (
        <Kosong judul="Belum ada notifikasi">Kabar pesanan dan panen surplus akan muncul di sini.</Kosong>
      ) : (
        <ul className="flex flex-col gap-2">
          {daftar.map((n) => {
            const { ikon, warna } = TAMPILAN[n.tipe];
            const tujuan = tujuanNotifikasi(n, peran);
            const isi = (
              <>
                <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${warna}`}>
                  <Ikon nama={ikon} className="size-5" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className={`text-base ${n.dibaca ? "text-redup" : "text-teks"}`}>{n.pesan}</span>
                  <span className="text-xs text-redup">{waktuLalu(n.dibuat_pada)}</span>
                </span>
                {!n.dibaca && (
                  <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-terakota">
                    <span className="sr-only">Belum dibaca</span>
                  </span>
                )}
              </>
            );
            const kelas = `flex w-full items-start gap-3 rounded-2xl p-4 text-left shadow-sm transition ${
              n.dibaca ? "bg-kartu/60" : "bg-kartu hover:shadow-md"
            }`;
            const ketuk = () => !n.dibaca && tandai([n.id]);
            return (
              <li key={n.id}>
                {tujuan ? (
                  <Link href={tujuan} onClick={ketuk} className={kelas}>
                    {isi}
                  </Link>
                ) : (
                  <button type="button" onClick={ketuk} className={kelas}>
                    {isi}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
