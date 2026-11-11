"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { PesananLengkap } from "@/types";
import { Button, kelasTombol } from "@/components/ui/Button";
import { Ikon, type NamaIkon } from "@/components/ui/Ikon";
import { kelasInput } from "@/components/ui/Input";
import { Galat, Kosong, Memuat } from "@/components/ui/Keadaan";
import { JudulHalaman, TautanKembali } from "@/components/penjual/bersama";
import { namaPembeli, RingkasanPesanan } from "@/components/penjual/KartuPesananMasuk";
import { formatKg } from "@/lib/format";
import { ambilJson, useMuat } from "@/lib/klien";

const ALASAN = [
  "Terserang hama atau penyakit",
  "Cuaca buruk, banjir, atau kekeringan",
  "Hasil panen lebih sedikit dari perkiraan",
];
const LAINNYA = "Lainnya";

const AKIBAT: { ikon: NamaIkon; teks: string }[] = [
  { ikon: "lonceng", teks: "Pembeli diberi tahu, lengkap dengan alasan Anda." },
  { ikon: "orang", teks: "Pembeli langsung ditawari 3 penjual pengganti yang paling cocok." },
  { ikon: "paket", teks: "Stok pesanan ini kembali ke panen Anda." },
];

function FormGagalPanen({ p, setelah }: { p: PesananLengkap; setelah: () => void }) {
  const [pilihan, setPilihan] = useState<string | null>(null);
  const [lainnya, setLainnya] = useState("");
  const [dicoba, setDicoba] = useState(false);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  const alasan = pilihan === LAINNYA ? lainnya.trim() : pilihan;
  const galatAlasan = !pilihan
    ? "Pilih apa yang terjadi."
    : pilihan === LAINNYA && (alasan ?? "").length < 3
      ? "Tulis singkat apa yang terjadi (minimal 3 huruf)."
      : null;

  async function kirim(e: FormEvent) {
    e.preventDefault();
    setDicoba(true);
    if (galatAlasan) return;
    setProses(true);
    setGalat(null);
    try {
      await ambilJson(`/api/orders/${p.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "gagal_panen", alasan }),
      });
      setelah();
    } catch (err) {
      setGalat((err as Error).message);
      setProses(false);
    }
  }

  return (
    <form onSubmit={kirim} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-2xl bg-kartu p-5 shadow-sm">
        <p className="flex items-center gap-2 font-serif text-lg">
          <Ikon nama="toko" className="size-5 text-daun" /> {namaPembeli(p)}
        </p>
        <RingkasanPesanan p={p} />
      </div>

      <fieldset className="flex flex-col gap-2" aria-describedby={dicoba && galatAlasan ? "galat-alasan" : undefined}>
        <legend className="mb-2 font-serif text-xl">Apa yang terjadi?</legend>
        {[...ALASAN, LAINNYA].map((a) => (
          <label
            key={a}
            className={`flex min-h-14 items-center gap-3 rounded-xl px-4 py-3 text-base transition ${
              pilihan === a ? "bg-cabai-muda ring-2 ring-cabai/50" : "bg-kartu ring-1 ring-garis hover:bg-pasir/40"
            }`}
          >
            <input
              type="radio"
              name="alasan"
              value={a}
              checked={pilihan === a}
              onChange={() => setPilihan(a)}
              className="size-5 shrink-0 accent-cabai"
            />
            {a}
          </label>
        ))}
        {pilihan === LAINNYA && (
          <>
            <label htmlFor="alasan-lain" className="sr-only">
              Tulis alasan
            </label>
            <textarea
              id="alasan-lain"
              rows={3}
              maxLength={300}
              value={lainnya}
              onChange={(e) => setLainnya(e.target.value)}
              placeholder="Tulis singkat, mis. tanaman roboh terkena angin"
              className={`${kelasInput} resize-none py-3`}
            />
          </>
        )}
        {dicoba && galatAlasan && (
          <p id="galat-alasan" role="alert" className="text-sm text-cabai">
            {galatAlasan}
          </p>
        )}
      </fieldset>

      <section aria-labelledby="judul-akibat" className="flex flex-col gap-3 rounded-2xl bg-pasir/45 p-4 md:p-5">
        <h2 id="judul-akibat" className="label-cetak text-sm text-redup">
          Setelah dibatalkan
        </h2>
        <ul className="flex flex-col gap-2.5">
          {AKIBAT.map((a) => (
            <li key={a.teks} className="flex gap-3 text-base">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-kartu text-daun">
                <Ikon nama={a.ikon} className="size-4" />
              </span>
              <span className="pt-1">{a.teks}</span>
            </li>
          ))}
        </ul>
      </section>

      {galat && <Galat pesan={galat} />}
      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Button type="submit" varian="bahaya" penuh disabled={proses}>
          {proses ? "Membatalkan…" : `Batalkan pesanan ${formatKg(p.jumlah_kg)}`}
        </Button>
        <Link href="/penjual/pesanan" className={kelasTombol("kedua", true)}>
          Kembali, panen tetap jalan
        </Link>
      </div>
    </form>
  );
}

export default function Page() {
  const { id } = useParams<{ id: string }>();
  const [selesai, setSelesai] = useState(false);
  const { data, galat, memuat, muatUlang } = useMuat(() => ambilJson<PesananLengkap>(`/api/orders/${id}`), [id]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <TautanKembali href="/penjual/pesanan">Pesanan Masuk</TautanKembali>
      <JudulHalaman
        judul="Batalkan karena gagal panen"
        sub="Kabar buruk lebih baik disampaikan cepat, supaya pembeli sempat mencari pengganti."
      />
      {selesai ? (
        <div role="status" className="flex flex-col items-center gap-3 rounded-2xl bg-kartu p-6 text-center shadow-sm">
          <span className="flex size-12 items-center justify-center rounded-full bg-pasir text-daun">
            <Ikon nama="centang" className="size-6" />
          </span>
          <p className="font-serif text-xl leading-snug">Pesanan dibatalkan</p>
          <p className="text-base text-redup">Pembeli sudah diberi tahu dan ditawari penjual pengganti.</p>
          <Link href="/penjual/pesanan" className={kelasTombol("utama", true)}>
            Kembali ke Pesanan Masuk
          </Link>
        </div>
      ) : memuat && !data ? (
        <Memuat />
      ) : galat ? (
        <Galat pesan={galat} ulangi={muatUlang} />
      ) : !data ? (
        <Kosong judul="Pesanan tidak ditemukan" />
      ) : !data.aksi.includes("gagal_panen") ? (
        <Kosong judul="Pesanan ini tidak bisa dibatalkan lagi">
          Pembatalan karena gagal panen hanya untuk pesanan yang sudah diterima dan belum dikirim.
        </Kosong>
      ) : (
        <FormGagalPanen p={data} setelah={() => setSelesai(true)} />
      )}
    </div>
  );
}
