"use client";

import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { HariBerulang, HasilMatching, KebutuhanAI } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Ikon } from "@/components/ui/Ikon";
import { Button } from "@/components/ui/Button";
import { Field, Input, kelasInput } from "@/components/ui/Input";
import { Galat, Kosong, MemuatGrid } from "@/components/ui/Keadaan";
import { KartuMatching } from "@/components/pembeli/KartuMatching";
import { IlustrasiLadang } from "@/components/ui/IlustrasiLadang";
import { ambilJson, useKecamatan, useKomoditas } from "@/lib/klien";
import { buatSupabaseBrowser } from "@/lib/supabase/client";
import { hariIniWib, tambahHari } from "@/lib/tanggal";

const HARI = ["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"] as const;

interface FormKebutuhan {
  komoditasId: string;
  jumlah: string;
  tanggal: string;
  berulang: HariBerulang | "";
}

export default function Page() {
  // key: kotak cari di header bisa mengirim ?q= baru saat halaman ini sudah terbuka.
  const q = useSearchParams().get("q") ?? "";
  return <CariPemasok key={q} teksAwal={q} />;
}

function CariPemasok({ teksAwal }: { teksAwal: string }) {
  const kecamatan = useKecamatan();
  const komoditas = useKomoditas();
  const [teks, setTeks] = useState(teksAwal);
  const [ai, setAi] = useState<{ memuat: boolean; pesan: string | null; label: string | null }>({
    memuat: false,
    pesan: null,
    label: null,
  });
  const [form, setForm] = useState<FormKebutuhan>({
    komoditasId: "1",
    jumlah: "",
    tanggal: tambahHari(hariIniWib(), 7),
    berulang: "",
  });
  const [cari, setCari] = useState<{
    memuat: boolean;
    galat: string | null;
    hasil: HasilMatching[] | null;
    kebutuhanId: string | null;
  }>({ memuat: false, galat: null, hasil: null, kebutuhanId: null });

  async function isiDenganAi() {
    setAi({ memuat: true, pesan: null, label: null });
    try {
      const r = await ambilJson<{ data: KebutuhanAI; label: string }>("/api/ai/kebutuhan", {
        method: "POST",
        body: JSON.stringify({ teks }),
      });
      setForm((f) => ({
        komoditasId: String(r.data.komoditas_id),
        jumlah: r.data.jumlah_kg == null ? f.jumlah : String(r.data.jumlah_kg),
        tanggal: r.data.tgl_butuh ?? f.tanggal,
        berulang: r.data.berulang ?? "",
      }));
      const kurang = [r.data.jumlah_kg == null && "jumlah", r.data.tgl_butuh == null && "tanggal"].filter(
        Boolean,
      );
      setAi({
        memuat: false,
        label: r.label,
        pesan: kurang.length ? `Lengkapi ${kurang.join(" dan ")} di bawah.` : null,
      });
    } catch (err) {
      // AI gagal: form manual di bawah tetap bisa dipakai.
      setAi({ memuat: false, label: null, pesan: (err as Error).message });
    }
  }

  async function cariPemasok(e: FormEvent) {
    e.preventDefault();
    const jumlah_kg = Number(form.jumlah);
    setCari({ memuat: true, galat: null, hasil: null, kebutuhanId: null });

    // Simpan kebutuhan supaya pre-order tercatat berasal dari kebutuhan ini. Gagal simpan tidak menghalangi pencarian.
    const keb = await Promise.resolve()
      .then(() =>
        buatSupabaseBrowser()
          .from("kebutuhan")
          .insert({
            komoditas_id: Number(form.komoditasId),
            jumlah_kg,
            tgl_butuh: form.tanggal,
            berulang: form.berulang || null,
            teks_asli: teks.trim() || null,
            dibuat_ai: ai.label !== null,
          })
          .select("id")
          .single(),
      )
      .then(
        (r) => r.data as { id: string } | null,
        () => null,
      );

    try {
      const { hasil } = await ambilJson<{ hasil: HasilMatching[] }>("/api/match", {
        method: "POST",
        body: JSON.stringify({ komoditas_id: Number(form.komoditasId), jumlah_kg, tgl_butuh: form.tanggal }),
      });
      setCari({ memuat: false, galat: null, hasil, kebutuhanId: keb?.id ?? null });
    } catch (err) {
      setCari({ memuat: false, galat: (err as Error).message, hasil: null, kebutuhanId: null });
    }
  }

  return (
    <>
      <div>
        <h1 className="font-serif text-3xl md:text-4xl">Cari Pemasok</h1>
        <p className="text-redup">Tulis kebutuhan Anda seperti mengirim pesan WhatsApp.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <div className="flex flex-col gap-3 rounded-2xl bg-kartu p-5 shadow-sm">
            <p className="font-serif text-lg">1. Ceritakan kebutuhan Anda</p>
            <Field label="Kebutuhan" htmlFor="teks">
              <textarea
                id="teks"
                rows={3}
                maxLength={300}
                value={teks}
                onChange={(e) => setTeks(e.target.value)}
                placeholder="Contoh: butuh 20 kg cabai rawit tiap Senin"
                className={`${kelasInput} py-3`}
              />
            </Field>
            <Button varian="kedua" penuh disabled={ai.memuat || teks.trim().length < 3} onClick={isiDenganAi}>
              <Ikon nama="kilau" className="size-4" />
              {ai.memuat ? "AI sedang membaca…" : "Isi form dengan AI"}
            </Button>
          </div>

          <form onSubmit={cariPemasok} className="flex flex-col gap-4 rounded-2xl bg-kartu p-5 shadow-sm">
            <p className="font-serif text-lg">2. Periksa lalu cari</p>
            {ai.label && (
              <Badge nada="kuning" ikon="kilau">
                {ai.label}
              </Badge>
            )}
            {ai.pesan && <p className="text-sm text-kunyit">{ai.pesan}</p>}
            <Field label="Komoditas" htmlFor="komoditas">
              <select
                id="komoditas"
                value={form.komoditasId}
                onChange={(e) => setForm({ ...form, komoditasId: e.target.value })}
                className={kelasInput}
              >
                {[...komoditas.values()].map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama}
                  </option>
                ))}
              </select>
            </Field>
            <Input
              label="Jumlah (kg)"
              type="number"
              inputMode="decimal"
              min={0.1}
              max={100000}
              step={0.1}
              required
              value={form.jumlah}
              onChange={(e) => setForm({ ...form, jumlah: e.target.value })}
            />
            <Input
              label="Dibutuhkan tanggal"
              type="date"
              required
              min={hariIniWib()}
              value={form.tanggal}
              onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
            />
            <Field label="Berulang?" htmlFor="berulang">
              <select
                id="berulang"
                value={form.berulang}
                onChange={(e) => setForm({ ...form, berulang: e.target.value as FormKebutuhan["berulang"] })}
                className={kelasInput}
              >
                <option value="">Sekali saja</option>
                {HARI.map((h) => (
                  <option key={h} value={`mingguan:${h}`}>
                    Tiap {h[0].toUpperCase() + h.slice(1)}
                  </option>
                ))}
              </select>
            </Field>
            <Button type="submit" penuh disabled={cari.memuat}>
              {cari.memuat ? "Mencari…" : "Cari pemasok"}
            </Button>
          </form>
        </div>

        <div className="flex flex-col gap-3">
          {cari.memuat ? (
            <MemuatGrid jumlah={4} className="grid gap-4 sm:grid-cols-2" />
          ) : cari.galat ? (
            <Galat pesan={cari.galat} />
          ) : cari.hasil?.length === 0 ? (
            <Kosong judul="Belum ada panen yang cocok">Coba geser tanggal atau kurangi jumlah.</Kosong>
          ) : cari.hasil ? (
            <section className="flex flex-col gap-3">
              <h2 className="font-serif text-xl">{cari.hasil.length} pemasok cocok, skor tertinggi dulu</h2>
              <ul className="grid gap-4 *:min-w-0 sm:grid-cols-2">
                {cari.hasil.map((h) => (
                  <li key={h.listing.id}>
                    <KartuMatching
                      hasil={h}
                      kecamatan={kecamatan.get(h.penjual.kecamatan_id)}
                      jumlahKg={Number(form.jumlah)}
                      kebutuhanId={cari.kebutuhanId}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <div className="overflow-hidden rounded-3xl bg-kartu shadow-sm">
              <IlustrasiLadang className="h-48 w-full md:h-64" />
              <div className="flex flex-col gap-1 p-6 text-center">
                <p className="font-serif text-xl">Pemasok yang cocok muncul di sini</p>
                <p className="text-sm text-redup">
                  Kami urutkan berdasarkan tanggal panen, jumlah stok, dan jarak dari usaha Anda.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
