"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { Peran } from "@/types";
import { Button } from "@/components/ui/Button";
import { Field, Input, kelasInput } from "@/components/ui/Input";
import { Galat } from "@/components/ui/Keadaan";
import { Ikon, type NamaIkon } from "@/components/ui/Ikon";
import { tandaiTutorial } from "@/components/Tutorial";
import { PanelAuth } from "../PanelAuth";
import { ambilJson, ambilKecamatan, useMuat } from "@/lib/klien";

const PILIHAN_PERAN: { peran: Peran; judul: string; teks: string; ikon: NamaIkon }[] = [
  { peran: "penjual", judul: "Penjual", teks: "Kelompok tani / koperasi", ikon: "tunas" },
  { peran: "pembeli", judul: "Pembeli", teks: "Warung, resto, katering", ikon: "toko" },
];

export default function Page() {
  const [peran, setPeran] = useState<Peran | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [mengirim, setMengirim] = useState(false);
  const [cekEmail, setCekEmail] = useState(false);
  const kecamatan = useMuat(ambilKecamatan);

  // Penjual MVP di Kab. Garut, pembeli di Kota Bandung: tampilkan wilayahnya lebih dulu.
  const wilayah: string[] =
    peran === "penjual" ? ["Kab. Garut", "Kota Bandung"] : ["Kota Bandung", "Kab. Garut"];
  const daftarKec = [...(kecamatan.data?.values() ?? [])];

  async function kirim(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!peran) return setGalat("Pilih dulu: Anda penjual atau pembeli.");
    const f = new FormData(e.currentTarget);
    setMengirim(true);
    setGalat(null);
    try {
      const hasil = await ambilJson<{ perlu_konfirmasi_email: boolean; lanjut: string }>("/api/auth/daftar", {
        method: "POST",
        body: JSON.stringify({
          peran,
          nama: f.get("nama"),
          nama_usaha: f.get("nama_usaha"),
          kecamatan_id: Number(f.get("kecamatan_id")),
          no_hp: f.get("no_hp"),
          email: f.get("email"),
          password: f.get("password"),
        }),
      });
      if (hasil.perlu_konfirmasi_email) {
        setCekEmail(true);
        setMengirim(false);
      } else {
        tandaiTutorial(true);
        window.location.assign(hasil.lanjut);
      }
    } catch (err) {
      setGalat((err as Error).message);
      setMengirim(false);
    }
  }

  if (cekEmail) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-12">
        <h1 className="font-serif text-4xl font-normal">Cek email Anda</h1>
        <p>Kami mengirim tautan konfirmasi. Buka tautan itu, lalu masuk.</p>
        <Link href="/masuk" className="font-semibold text-daun underline">
          Ke halaman Masuk
        </Link>
      </main>
    );
  }

  return (
    <PanelAuth judul="Buat akun" teks="Gratis untuk petani dan pelaku usaha kuliner.">
      <form onSubmit={kirim} className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-2">
          <legend className="label-cetak mb-2 text-sm text-redup">Saya adalah</legend>
          <div className="grid grid-cols-2 gap-3">
            {PILIHAN_PERAN.map((p) => (
              <label
                key={p.peran}
                className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl p-4 text-center ring-1 transition has-focus-visible:outline-2 has-focus-visible:outline-daun ${
                  peran === p.peran
                    ? "bg-pasir/70 ring-2 ring-terakota"
                    : "bg-latar/60 ring-garis hover:bg-pasir/40"
                }`}
              >
                <input
                  type="radio"
                  name="peran"
                  value={p.peran}
                  checked={peran === p.peran}
                  onChange={() => setPeran(p.peran)}
                  className="sr-only"
                />
                <span className="flex size-12 items-center justify-center rounded-full bg-kartu text-daun">
                  <Ikon nama={p.ikon} className="size-6" />
                </span>
                <span className="font-serif text-lg leading-none">{p.judul}</span>
                <span className="text-sm text-redup">{p.teks}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <Input label="Nama Anda" name="nama" autoComplete="name" required minLength={2} />
        <Input
          label={peran === "penjual" ? "Nama kelompok tani / koperasi" : "Nama usaha"}
          name="nama_usaha"
          petunjuk="Boleh dikosongkan"
        />
        <Field label="Kecamatan" htmlFor="kecamatan_id" galat={kecamatan.galat}>
          <select id="kecamatan_id" name="kecamatan_id" required defaultValue="" className={kelasInput}>
            <option value="" disabled>
              {kecamatan.memuat ? "Memuat…" : "Pilih kecamatan"}
            </option>
            {wilayah.map((w) => (
              <optgroup key={w} label={w}>
                {daftarKec
                  .filter((k) => k.kab_kota === w)
                  .map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </Field>
        <Input
          label="Nomor HP (WhatsApp)"
          name="no_hp"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="081234567890"
          petunjuk="Hanya terlihat oleh pihak lain setelah pesanan dikonfirmasi."
          required
        />
        <Input label="Email" name="email" type="email" autoComplete="email" required />
        <Input
          label="Kata sandi"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          petunjuk="Minimal 8 karakter"
          required
        />
        {galat && <Galat pesan={galat} />}
        <Button type="submit" penuh disabled={mengirim}>
          {mengirim ? "Memproses…" : "Daftar"}
        </Button>
      </form>
      <p className="text-center text-base text-redup">
        Sudah punya akun?{" "}
        <Link href="/masuk" className="font-semibold text-daun underline">
          Masuk
        </Link>
      </p>
    </PanelAuth>
  );
}
