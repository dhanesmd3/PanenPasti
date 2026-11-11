"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import type { Listing, ListingAI } from "@/types";
import { Button } from "@/components/ui/Button";
import { Ikon } from "@/components/ui/Ikon";
import { Field, Input, kelasInput } from "@/components/ui/Input";
import { Galat } from "@/components/ui/Keadaan";
import { formatKg, formatRupiah } from "@/lib/format";
import { ambilJson, useKomoditas, useMuat } from "@/lib/klien";
import { buatSupabaseBrowser } from "@/lib/supabase/client";
import { dariNomorHari, hariIniWib, keNomorHari, tambahHari, tanggalPanjang } from "@/lib/tanggal";
import { LabelAI } from "./bersama";
import { ambilPrediksi, BUCKET_FOTO, idSaya, KOLOM_PANEN, pesanGalatDb } from "./data";

type Satuan = "kg" | "kuintal";

const KG_PER_KUINTAL = 100;
const MAKS_KG = 100_000;
const MAKS_FOTO = 5 * 1024 * 1024;
const JENIS_FOTO = ["image/jpeg", "image/png", "image/webp"];
const PILIHAN_KUALITAS = ["Super", "Bagus", "Campur"];

function akhirBulan(hariIni: string): string {
  const [y, m] = hariIni.split("-").map(Number);
  const awalBulanDepan = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  return dariNomorHari(keNomorHari(awalBulanDepan) - 1);
}

/** Angka di input boleh memakai koma desimal ("2,5"). */
function keAngka(teks: string): number {
  return Number(teks.replace(/\./g, "").replace(",", "."));
}

function tampilAngka(n: number): string {
  return String(Math.round(n * 100) / 100).replace(".", ",");
}

function Pilihan({ aktif, onClick, children }: { aktif: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={aktif}
      onClick={onClick}
      className={`label-cetak min-h-11 rounded-full px-4 text-sm transition ${
        aktif ? "bg-teks text-kartu" : "bg-latar text-teks ring-1 ring-garis hover:bg-pasir/60"
      }`}
    >
      {children}
    </button>
  );
}

export function FormPanen({ listing }: { listing?: Listing }) {
  const router = useRouter();
  const idForm = useId();
  const komoditas = useKomoditas();
  const hariIni = hariIniWib();
  const terpesan = listing ? Math.max(0, listing.jumlah_kg - listing.sisa_kg) : 0;

  const [komoditasId, setKomoditasId] = useState(listing?.komoditas_id ?? 1);
  const [satuan, setSatuan] = useState<Satuan>(
    listing && listing.jumlah_kg >= KG_PER_KUINTAL && listing.jumlah_kg % KG_PER_KUINTAL === 0 ? "kuintal" : "kg",
  );
  const [jumlah, setJumlah] = useState(() => {
    if (!listing) return "";
    return tampilAngka(satuan === "kuintal" ? listing.jumlah_kg / KG_PER_KUINTAL : listing.jumlah_kg);
  });
  const [tgl, setTgl] = useState(listing?.tgl_panen ?? "");
  const [kualitas, setKualitas] = useState(listing?.kualitas ?? "");
  const [harga, setHarga] = useState(listing ? String(listing.harga_per_kg) : "");
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoLama, setFotoLama] = useState<string | null>(listing?.foto_url ?? null);

  const [teksAI, setTeksAI] = useState("");
  const [prosesAI, setProsesAI] = useState(false);
  const [hasilAI, setHasilAI] = useState<string | null>(null);
  const [galatAI, setGalatAI] = useState<string | null>(null);

  const [dicoba, setDicoba] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [galatFoto, setGalatFoto] = useState<string | null>(null);

  const pratinjau = useMemo(() => (foto ? URL.createObjectURL(foto) : null), [foto]);
  useEffect(() => () => void (pratinjau && URL.revokeObjectURL(pratinjau)), [pratinjau]);

  const angka = keAngka(jumlah);
  const kg = satuan === "kuintal" ? angka * KG_PER_KUINTAL : angka;
  const rupiah = Number(harga);
  const tglBerubah = !listing || tgl !== listing.tgl_panen;

  const galatJumlah =
    jumlah.trim() === "" || !(kg > 0)
      ? "Isi jumlah panen lebih dari 0."
      : kg > MAKS_KG
        ? "Paling banyak 100.000 kg (1.000 kuintal)."
        : kg < terpesan
          ? `Sudah dipesan ${formatKg(terpesan)}, jadi jumlah tidak boleh kurang dari itu.`
          : null;
  const galatTgl = !tgl ? "Pilih perkiraan tanggal panen." : tglBerubah && tgl < hariIni ? "Tanggal panen tidak boleh lewat." : null;
  const galatHarga =
    harga === "" || !Number.isInteger(rupiah)
      ? "Isi harga per kg dalam rupiah."
      : rupiah < 1000
        ? "Harga paling rendah Rp1.000/kg."
        : rupiah > 1_000_000
          ? "Harga paling tinggi Rp1.000.000/kg."
          : null;
  const galatKualitas = kualitas.trim().length > 100 ? "Keterangan kualitas paling panjang 100 huruf." : null;
  const adaGalat = !!(galatJumlah || galatTgl || galatHarga || galatKualitas);

  // Saran harga dari prediksi untuk minggu panen yang dipilih (hanya cabai rawit merah, id 1).
  // Baru dimuat setelah tanggal panen dipilih, karena sarannya untuk minggu panen itu.
  const tglPrediksi = !galatTgl ? tgl : null;
  const { data: prediksi } = useMuat(
    () => (komoditasId === 1 && tglPrediksi ? ambilPrediksi(tglPrediksi) : Promise.resolve(null)),
    [tglPrediksi, komoditasId],
  );
  const hargaSaran = prediksi?.prediksi_petani.find((p) => p.tanggal === prediksi.minggu_panen)?.nilai;

  function ubahSatuan(baru: Satuan) {
    if (baru === satuan) return;
    if (jumlah.trim() !== "" && angka > 0) {
      setJumlah(tampilAngka(baru === "kuintal" ? angka / KG_PER_KUINTAL : angka * KG_PER_KUINTAL));
    }
    setSatuan(baru);
  }

  function geser(arah: 1 | -1) {
    const langkah = satuan === "kuintal" ? 1 : 10;
    const awal = jumlah.trim() === "" || !(angka >= 0) ? 0 : angka;
    setJumlah(tampilAngka(Math.max(0, Math.round((awal + arah * langkah) / langkah) * langkah)));
  }

  function pilihFoto(file: File | undefined) {
    setGalatFoto(null);
    if (!file) return;
    if (!JENIS_FOTO.includes(file.type)) return setGalatFoto("Foto harus JPG, PNG, atau WebP.");
    if (file.size > MAKS_FOTO) return setGalatFoto("Ukuran foto paling besar 5 MB.");
    setFoto(file);
  }

  function terapkanAI(d: ListingAI) {
    if (d.komoditas_id) setKomoditasId(d.komoditas_id);
    if (d.jumlah_kg) {
      const kuintal = d.jumlah_kg >= KG_PER_KUINTAL && d.jumlah_kg % KG_PER_KUINTAL === 0;
      setSatuan(kuintal ? "kuintal" : "kg");
      setJumlah(tampilAngka(kuintal ? d.jumlah_kg / KG_PER_KUINTAL : d.jumlah_kg));
    }
    if (d.tgl_panen) setTgl(d.tgl_panen);
    if (d.kualitas) setKualitas(d.kualitas);
    if (d.harga_per_kg) setHarga(String(Math.round(d.harga_per_kg)));
  }

  async function isiDenganAI() {
    if (teksAI.trim().length < 3) return setGalatAI("Tulis keterangan panen dulu, minimal 3 huruf.");
    setProsesAI(true);
    setGalatAI(null);
    setHasilAI(null);
    try {
      const r = await ambilJson<{ ok: true; data: ListingAI; label: string }>("/api/ai/listing", {
        method: "POST",
        body: JSON.stringify({ teks: teksAI.trim() }),
      });
      terapkanAI(r.data);
      const kosong = [
        !r.data.jumlah_kg && "jumlah",
        !r.data.tgl_panen && "tanggal panen",
        !r.data.harga_per_kg && "harga",
      ].filter(Boolean);
      setHasilAI(kosong.length ? `${r.label}. Belum disebut: ${kosong.join(", ")}.` : r.label);
    } catch (e) {
      setGalatAI(`${(e as Error).message} Isi form di bawah secara manual.`);
    } finally {
      setProsesAI(false);
    }
  }

  async function unggahFoto(file: File): Promise<string> {
    const uid = await idSaya();
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const supabase = buatSupabaseBrowser();
    const path = `${uid}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET_FOTO).upload(path, file, { contentType: file.type });
    if (error) throw new Error("Foto gagal diunggah. Coba lagi, atau simpan tanpa foto.");
    return supabase.storage.from(BUCKET_FOTO).getPublicUrl(path).data.publicUrl;
  }

  async function simpan(e: FormEvent) {
    e.preventDefault();
    setDicoba(true);
    if (adaGalat) return;
    setMenyimpan(true);
    setGalat(null);
    try {
      const fotoUrl = foto ? await unggahFoto(foto) : fotoLama;
      const isi = {
        komoditas_id: komoditasId,
        jumlah_kg: Math.round(kg * 100) / 100,
        kualitas: kualitas.trim() || null,
        tgl_panen: tgl,
        harga_per_kg: rupiah,
        foto_url: fotoUrl,
        // Panen yang ditutup manual tetap tertutup; selain itu status mengikuti tanggal.
        status: listing?.status === "habis" ? "habis" : tgl <= hariIni ? "siap" : "estimasi",
      };
      const supabase = buatSupabaseBrowser();
      const { data, error } = listing
        ? await supabase.from("listings").update(isi).eq("id", listing.id).select(KOLOM_PANEN).single()
        : await supabase.from("listings").insert(isi).select(KOLOM_PANEN).single();
      if (error || !data) throw new Error(pesanGalatDb(error));
      router.push(`/penjual/panen?tersimpan=${(data as { id: string }).id}`);
    } catch (err) {
      setGalat((err as Error).message);
      setMenyimpan(false);
    }
  }

  const pilihanTgl: [string, string][] = [
    ["1 minggu lagi", tambahHari(hariIni, 7)],
    ["2 minggu lagi", tambahHari(hariIni, 14)],
    ["Akhir bulan", akhirBulan(hariIni)],
  ];
  const tampilFoto = pratinjau ?? fotoLama;
  const daftarKomoditas = [...komoditas.values()];

  return (
    <form onSubmit={simpan} noValidate className="flex flex-col gap-6">
      <section aria-labelledby={`${idForm}-ai`} className="flex flex-col gap-3 rounded-2xl bg-pasir/45 p-4 md:p-5">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-kartu text-daun">
            <Ikon nama="kilau" />
          </span>
          <div>
            <h2 id={`${idForm}-ai`} className="font-serif text-lg leading-snug">
              Isi cepat dengan AI
            </h2>
            <p className="text-sm text-redup">Ceritakan panen Anda seperti mengetik pesan.</p>
          </div>
        </div>
        <label htmlFor={`${idForm}-teks-ai`} className="sr-only">
          Keterangan panen
        </label>
        <textarea
          id={`${idForm}-teks-ai`}
          rows={2}
          maxLength={300}
          value={teksAI}
          onChange={(e) => setTeksAI(e.target.value)}
          placeholder="Contoh: cabai rawit 5 kuintal panen akhir bulan, bagus, 35 ribu"
          className={`${kelasInput} min-h-20 resize-none py-3`}
        />
        <Button varian="kedua" onClick={isiDenganAI} disabled={prosesAI} className="self-start">
          <Ikon nama="kilau" className="size-4" />
          {prosesAI ? "AI sedang mengisi…" : "Isi dengan AI"}
        </Button>
        {hasilAI && <LabelAI>{hasilAI}</LabelAI>}
        {galatAI && (
          <p role="alert" className="text-sm text-cabai">
            {galatAI}
          </p>
        )}
      </section>

      {daftarKomoditas.length > 1 ? (
        <Field label="Komoditas" htmlFor={`${idForm}-komoditas`}>
          <select
            id={`${idForm}-komoditas`}
            value={komoditasId}
            onChange={(e) => setKomoditasId(Number(e.target.value))}
            className={kelasInput}
          >
            {daftarKomoditas.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama}
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <div className="flex flex-col gap-1">
          <p className="label-cetak text-sm text-redup">Komoditas</p>
          <p className="flex items-center gap-2 font-serif text-lg">
            <Ikon nama="tunas" className="size-5 text-[#4c5a2c]" />
            {daftarKomoditas[0]?.nama ?? "Cabai Rawit Merah"}
          </p>
        </div>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="label-cetak mb-1 text-sm text-redup">Jumlah panen</legend>
        <div className="flex flex-wrap items-stretch gap-3">
          <div className="flex min-w-0 flex-1 items-stretch rounded-xl bg-kartu ring-1 ring-garis focus-within:ring-4 focus-within:ring-terakota/25">
            <button
              type="button"
              onClick={() => geser(-1)}
              aria-label={`Kurangi ${satuan === "kuintal" ? "1 kuintal" : "10 kg"}`}
              className="flex w-14 shrink-0 items-center justify-center rounded-l-xl text-teks transition hover:bg-pasir/60"
            >
              <Ikon nama="kurang" />
            </button>
            <label htmlFor={`${idForm}-jumlah`} className="sr-only">
              Jumlah dalam {satuan}
            </label>
            <input
              id={`${idForm}-jumlah`}
              inputMode="decimal"
              autoComplete="off"
              value={jumlah}
              onChange={(e) => setJumlah(e.target.value.replace(/[^\d.,]/g, ""))}
              placeholder="0"
              aria-invalid={dicoba && galatJumlah ? true : undefined}
              aria-describedby={`${idForm}-jumlah-info`}
              className="min-h-14 w-full min-w-0 bg-transparent text-center font-narrow text-3xl font-bold text-teks placeholder:text-redup/50 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => geser(1)}
              aria-label={`Tambah ${satuan === "kuintal" ? "1 kuintal" : "10 kg"}`}
              className="flex w-14 shrink-0 items-center justify-center rounded-r-xl text-teks transition hover:bg-pasir/60"
            >
              <Ikon nama="tambah" />
            </button>
          </div>
          <div role="radiogroup" aria-label="Satuan" className="flex rounded-xl bg-latar p-1 ring-1 ring-garis">
            {(["kg", "kuintal"] as const).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={satuan === s}
                onClick={() => ubahSatuan(s)}
                className={`label-cetak min-h-12 rounded-lg px-4 text-sm transition ${
                  satuan === s ? "bg-kartu text-teks shadow-sm" : "text-redup hover:text-teks"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <p
          id={`${idForm}-jumlah-info`}
          role={dicoba && galatJumlah ? "alert" : undefined}
          className={`text-sm ${dicoba && galatJumlah ? "text-cabai" : "text-redup"}`}
        >
          {dicoba && galatJumlah
            ? galatJumlah
            : satuan === "kuintal" && kg > 0
              ? `= ${formatKg(kg)} (1 kuintal = 100 kg)`
              : terpesan > 0
                ? `Sudah dipesan ${formatKg(terpesan)}.`
                : "Tombol − dan + mengubah 10 kg (atau 1 kuintal)."}
        </p>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="label-cetak mb-1 text-sm text-redup">Perkiraan tanggal panen</legend>
        <div className="flex flex-wrap gap-2">
          {pilihanTgl.map(([label, nilai]) => (
            <Pilihan key={label} aktif={tgl === nilai} onClick={() => setTgl(nilai)}>
              {label}
            </Pilihan>
          ))}
        </div>
        <label htmlFor={`${idForm}-tgl`} className="sr-only">
          Tanggal panen
        </label>
        <input
          id={`${idForm}-tgl`}
          type="date"
          min={tglBerubah ? hariIni : undefined}
          value={tgl}
          onChange={(e) => setTgl(e.target.value)}
          aria-invalid={dicoba && galatTgl ? true : undefined}
          className={kelasInput}
        />
        <p role={dicoba && galatTgl ? "alert" : undefined} className={`text-sm ${dicoba && galatTgl ? "text-cabai" : "text-redup"}`}>
          {dicoba && galatTgl ? galatTgl : tgl && !galatTgl ? tanggalPanjang(tgl) : "Boleh perkiraan, bisa diubah nanti."}
        </p>
      </fieldset>

      <div className="flex flex-col gap-2">
        <Input
          label="Kualitas (tidak wajib)"
          value={kualitas}
          maxLength={100}
          onChange={(e) => setKualitas(e.target.value)}
          placeholder="Mis. Super, merah merata"
          galat={galatKualitas}
        />
        <div className="flex flex-wrap gap-2">
          {PILIHAN_KUALITAS.map((k) => (
            <Pilihan key={k} aktif={kualitas === k} onClick={() => setKualitas(kualitas === k ? "" : k)}>
              {k}
            </Pilihan>
          ))}
        </div>
      </div>

      <Field
        label="Harga per kg"
        htmlFor={`${idForm}-harga`}
        galat={dicoba ? galatHarga : null}
        petunjuk={
          hargaSaran ? (
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>
                Perkiraan harga di petani minggu itu <strong className="font-semibold">{formatRupiah(hargaSaran)}/kg</strong>.
                Harga tetap Anda yang menentukan.
              </span>
              {String(hargaSaran) !== harga && (
                <button
                  type="button"
                  onClick={() => setHarga(String(hargaSaran))}
                  className="label-cetak text-daun underline-offset-4 hover:underline"
                >
                  Pakai harga ini
                </button>
              )}
            </span>
          ) : (
            "Harga Anda yang menentukan, bukan pengepul."
          )
        }
      >
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center font-narrow text-lg text-redup">
            Rp
          </span>
          <input
            id={`${idForm}-harga`}
            inputMode="numeric"
            autoComplete="off"
            value={harga ? Number(harga).toLocaleString("id-ID") : ""}
            onChange={(e) => setHarga(e.target.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 7))}
            placeholder="35.000"
            aria-invalid={dicoba && galatHarga ? true : undefined}
            aria-describedby={dicoba && galatHarga ? `${idForm}-harga-galat` : `${idForm}-harga-petunjuk`}
            className={`${kelasInput} pl-12 font-narrow text-xl font-bold`}
          />
        </div>
      </Field>

      <Field label="Foto panen (tidak wajib)" htmlFor={`${idForm}-foto`} galat={galatFoto}>
        {tampilFoto ? (
          <div className="flex items-center gap-4 rounded-xl bg-kartu p-3 ring-1 ring-garis">
            <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-pasir">
              <Image src={tampilFoto} alt="Pratinjau foto panen" fill unoptimized className="object-cover" />
            </div>
            <div className="flex flex-1 flex-wrap gap-2">
              <label
                htmlFor={`${idForm}-foto`}
                className="label-cetak flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-sm text-daun ring-1 ring-garis hover:bg-pasir/60"
              >
                <Ikon nama="kamera" className="size-4" /> Ganti
              </label>
              <button
                type="button"
                onClick={() => {
                  setFoto(null);
                  setFotoLama(null);
                }}
                className="label-cetak min-h-11 rounded-full px-4 text-sm text-cabai hover:bg-cabai-muda"
              >
                Hapus foto
              </button>
            </div>
          </div>
        ) : (
          <label
            htmlFor={`${idForm}-foto`}
            className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-garis bg-kartu/60 px-4 py-4 text-center transition hover:border-terakota hover:bg-kartu"
          >
            <Ikon nama="kamera" className="size-6 text-daun" />
            <span className="label-cetak text-sm text-daun">Ambil atau pilih foto</span>
            <span className="text-xs text-redup">JPG, PNG, atau WebP, paling besar 5 MB</span>
          </label>
        )}
        <input
          id={`${idForm}-foto`}
          type="file"
          accept={JENIS_FOTO.join(",")}
          capture="environment"
          onChange={(e) => {
            pilihFoto(e.target.files?.[0]);
            e.target.value = "";
          }}
          className="sr-only"
        />
      </Field>

      <div className="flex flex-col gap-4 rounded-2xl bg-kartu p-4 shadow-sm md:p-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm text-redup">Kalau terjual semua</span>
          <span className="font-narrow text-2xl font-bold">
            {galatJumlah || galatHarga ? "—" : formatRupiah(kg * rupiah)}
          </span>
        </div>
        {galat && <Galat pesan={galat} />}
        {dicoba && adaGalat && (
          <p role="alert" className="text-sm text-cabai">
            Masih ada isian yang perlu diperbaiki di atas.
          </p>
        )}
        <Button type="submit" penuh disabled={menyimpan}>
          <Ikon nama="centang" className="size-4" />
          {menyimpan ? "Menyimpan…" : listing ? "Simpan perubahan" : "Simpan panen"}
        </Button>
      </div>
    </form>
  );
}
