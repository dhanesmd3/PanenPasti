"use client";

// Ulasan pembeli (bintang 1–5 + komentar) dan balasan penjual. Tabel: public.ulasan.

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field, kelasInput } from "@/components/ui/Input";
import { Galat } from "@/components/ui/Keadaan";
import { pesanSupabase, useMuat } from "@/lib/klien";
import { waktuLalu } from "@/lib/notifikasi";
import { buatSupabaseBrowser } from "@/lib/supabase/client";

interface Ulasan {
  id: string;
  order_id: string;
  bintang: number;
  komentar: string | null;
  balasan: string | null;
  dibuat_pada: string;
  pembeli: { nama: string; nama_usaha: string | null } | null;
}

const KOLOM = "id, order_id, bintang, komentar, balasan, dibuat_pada, pembeli:profiles!pembeli_id(nama, nama_usaha)";

export function Bintang({ nilai, className = "" }: { nilai: number; className?: string }) {
  const bulat = Math.round(nilai);
  return (
    <span role="img" aria-label={`${nilai.toLocaleString("id-ID", { maximumFractionDigits: 1 })} dari 5 bintang`} className={`text-kunyit ${className}`}>
      {"★".repeat(bulat)}
      <span className="text-garis">{"★".repeat(5 - bulat)}</span>
    </span>
  );
}

/** Ringkasan + daftar ulasan untuk satu penjual. `bisaBalas` = penjual pemiliknya sedang melihat. */
export function DaftarUlasan({ penjualId, bisaBalas = false }: { penjualId: string; bisaBalas?: boolean }) {
  const { data, galat, memuat, muatUlang } = useMuat(async () => {
    const { data, error } = await buatSupabaseBrowser()
      .from("ulasan")
      .select(KOLOM)
      .eq("penjual_id", penjualId)
      .order("dibuat_pada", { ascending: false })
      .limit(50);
    if (error) throw new Error(pesanSupabase(error));
    return data as unknown as Ulasan[];
  }, [penjualId]);

  if (memuat) return <div role="status" className="kerangka h-24 rounded-2xl"><span className="sr-only">Memuat ulasan…</span></div>;
  if (galat) return <Galat pesan={galat} ulangi={muatUlang} />;
  if (!data?.length) return <p className="text-base text-redup">Belum ada ulasan dari pembeli.</p>;

  const rata = data.reduce((n, u) => n + u.bintang, 0) / data.length;
  return (
    <div className="flex flex-col gap-4">
      <p className="flex flex-wrap items-center gap-2 text-lg">
        <span className="font-narrow text-3xl font-bold">{rata.toLocaleString("id-ID", { maximumFractionDigits: 1 })}</span>
        <Bintang nilai={rata} className="text-2xl" />
        <span className="text-redup">dari {data.length} ulasan</span>
      </p>
      <ul className="flex flex-col gap-3">
        {data.map((u) => (
          <li key={u.id}>
            <KartuUlasan u={u} bisaBalas={bisaBalas} setelahBalas={muatUlang} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function KartuUlasan({ u, bisaBalas, setelahBalas }: { u: Ulasan; bisaBalas: boolean; setelahBalas: () => void }) {
  const [buka, setBuka] = useState(false);
  const [teks, setTeks] = useState(u.balasan ?? "");
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  async function kirim(e: FormEvent) {
    e.preventDefault();
    setProses(true);
    setGalat(null);
    const { error } = await buatSupabaseBrowser().from("ulasan").update({ balasan: teks }).eq("id", u.id);
    setProses(false);
    if (error) return setGalat(pesanSupabase(error));
    setBuka(false);
    setelahBalas();
  }

  return (
    <article className="flex flex-col gap-2 rounded-2xl bg-kartu p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-serif text-lg">{u.pembeli?.nama_usaha ?? u.pembeli?.nama ?? "Pembeli"}</p>
        <span className="text-base text-redup">{waktuLalu(u.dibuat_pada)}</span>
      </div>
      <Bintang nilai={u.bintang} className="text-xl" />
      {u.komentar && <p className="text-lg leading-relaxed">{u.komentar}</p>}

      {u.balasan && !buka && (
        <div className="mt-1 rounded-xl border-l-4 border-terakota bg-latar/70 px-4 py-3">
          <p className="label-cetak text-sm text-redup">Balasan penjual</p>
          <p className="text-lg leading-relaxed">{u.balasan}</p>
        </div>
      )}

      {bisaBalas && !buka && (
        <div>
          <Button varian="kedua" onClick={() => setBuka(true)}>
            {u.balasan ? "Ubah balasan" : "Balas ulasan"}
          </Button>
        </div>
      )}
      {buka && (
        <form onSubmit={kirim} className="flex flex-col gap-3">
          <Field label="Balasan Anda" htmlFor={`balas-${u.id}`}>
            <textarea
              id={`balas-${u.id}`}
              rows={3}
              maxLength={500}
              required
              value={teks}
              onChange={(e) => setTeks(e.target.value)}
              className={`${kelasInput} py-3`}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={proses || !teks.trim()}>
              {proses ? "Mengirim…" : "Kirim balasan"}
            </Button>
            <Button varian="teks" onClick={() => setBuka(false)}>
              Batal
            </Button>
          </div>
          {galat && <Galat pesan={galat} />}
        </form>
      )}
    </article>
  );
}

/** Untuk kartu pesanan Selesai di sisi pembeli: tampilkan ulasan, atau form kalau belum ada. */
export function UlasanPesanan({ orderId }: { orderId: string }) {
  // shortcut: satu query per kartu pesanan selesai; gabungkan ke /api/orders kalau pesanan selesai banyak.
  const { data, galat, memuat, muatUlang } = useMuat(async () => {
    const { data, error } = await buatSupabaseBrowser().from("ulasan").select(KOLOM).eq("order_id", orderId).maybeSingle();
    if (error) throw new Error(pesanSupabase(error));
    return { u: data as unknown as Ulasan | null };
  }, [orderId]);
  const [bintang, setBintang] = useState(0);
  const [komentar, setKomentar] = useState("");
  const [proses, setProses] = useState(false);
  const [galatKirim, setGalatKirim] = useState<string | null>(null);

  if (memuat) return null;
  if (galat) return <Galat pesan={galat} ulangi={muatUlang} />;
  if (data?.u) return <KartuUlasan u={data.u} bisaBalas={false} setelahBalas={muatUlang} />;

  async function kirim(e: FormEvent) {
    e.preventDefault();
    setProses(true);
    setGalatKirim(null);
    const { error } = await buatSupabaseBrowser().from("ulasan").insert({ order_id: orderId, bintang, komentar });
    setProses(false);
    if (error) return setGalatKirim(pesanSupabase(error));
    muatUlang();
  }

  return (
    <form onSubmit={kirim} className="flex flex-col gap-3 rounded-2xl bg-latar/70 p-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="label-cetak mb-1 text-base text-redup">Beri nilai untuk penjual</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} bintang`}
              aria-pressed={bintang === n}
              onClick={() => setBintang(n)}
              className={`flex size-12 items-center justify-center rounded-full text-3xl transition hover:bg-pasir/60 ${
                n <= bintang ? "text-kunyit" : "text-garis"
              }`}
            >
              ★
            </button>
          ))}
        </div>
      </fieldset>
      <Field label="Ceritakan pengalaman Anda (boleh kosong)" htmlFor={`ulas-${orderId}`}>
        <textarea
          id={`ulas-${orderId}`}
          rows={3}
          maxLength={500}
          value={komentar}
          onChange={(e) => setKomentar(e.target.value)}
          placeholder="Contoh: cabainya segar, pengiriman tepat waktu"
          className={`${kelasInput} py-3`}
        />
      </Field>
      <div>
        <Button type="submit" disabled={proses || bintang === 0}>
          {proses ? "Mengirim…" : "Kirim ulasan"}
        </Button>
      </div>
      {galatKirim && <Galat pesan={galatKirim} />}
    </form>
  );
}
