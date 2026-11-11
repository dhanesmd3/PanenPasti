"use client";

import Link from "next/link";
import { useState } from "react";
import type { OrderStatus, PesananLengkap } from "@/types";
import { Galat, Kosong, Memuat } from "@/components/ui/Keadaan";
import { JudulHalaman } from "@/components/penjual/bersama";
import { KartuPesananMasuk } from "@/components/penjual/KartuPesananMasuk";
import { ambilJson, useMuat } from "@/lib/klien";

const TAB: { label: string; status: OrderStatus[]; kosong: string }[] = [
  { label: "Baru", status: ["menunggu"], kosong: "Belum ada pesanan baru" },
  { label: "Berjalan", status: ["dikonfirmasi", "dikirim"], kosong: "Tidak ada pesanan yang sedang berjalan" },
  { label: "Selesai", status: ["selesai"], kosong: "Belum ada pesanan selesai" },
  { label: "Batal", status: ["ditolak", "dibatalkan", "gagal_panen"], kosong: "Tidak ada pesanan batal" },
];

export default function Page() {
  const [pilihan, setPilihan] = useState<number | null>(null);
  const { data, galat, memuat, muatUlang } = useMuat(() => ambilJson<PesananLengkap[]>("/api/orders?batas=100"));
  const jumlah = TAB.map((t) => (data ?? []).filter((p) => t.status.includes(p.status)).length);
  // Tab awal: "Baru" kalau ada yang perlu dijawab, selain itu "Berjalan".
  const tab = pilihan ?? (data && jumlah[0] === 0 && jumlah[1] > 0 ? 1 : 0);
  const tampil = (data ?? []).filter((p) => TAB[tab].status.includes(p.status));

  return (
    <>
      <JudulHalaman
        judul="Pesanan Masuk"
        sub={jumlah[0] > 0 ? `${jumlah[0]} pesanan menunggu jawaban Anda.` : "Pre-order dari warung dan katering."}
      />
      <div role="tablist" aria-label="Kelompok pesanan" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {TAB.map((t, i) => (
          <button
            key={t.label}
            id={`tab-${i}`}
            role="tab"
            aria-selected={tab === i}
            aria-controls="panel-pesanan"
            onClick={() => setPilihan(i)}
            className={`label-cetak flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm transition ${
              tab === i ? "bg-teks text-kartu" : "bg-kartu text-redup shadow-sm hover:text-teks"
            }`}
          >
            {t.label}
            {data && jumlah[i] > 0 && (
              <span
                className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs ${
                  i === 0 ? "bg-cabai text-kartu" : tab === i ? "bg-kartu/20" : "bg-pasir text-teks"
                }`}
              >
                {jumlah[i]}
              </span>
            )}
          </button>
        ))}
      </div>
      <div id="panel-pesanan" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {memuat && !data ? (
          <Memuat teks="Memuat pesanan…" />
        ) : galat ? (
          <Galat pesan={galat} ulangi={muatUlang} />
        ) : !tampil.length ? (
          <Kosong judul={data?.length ? TAB[tab].kosong : "Belum ada pesanan"}>
            {data?.length ? null : (
              <>
                Pesanan muncul di sini saat warung pre-order panen Anda.{" "}
                <Link href="/penjual/panen" className="font-semibold text-daun underline">
                  Cek panen Anda
                </Link>
              </>
            )}
          </Kosong>
        ) : (
          <ul className="grid gap-3 xl:grid-cols-2">
            {tampil.map((p) => (
              <li key={p.id}>
                <KartuPesananMasuk p={p} setelahUbah={muatUlang} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
