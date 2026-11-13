"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { Peran } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Ikon } from "@/components/ui/Ikon";
import { Field, Input, kelasInput } from "@/components/ui/Input";
import { Galat, Memuat } from "@/components/ui/Keadaan";
import { ambilProfilSaya, inisial, tampilNoHp, ubahProfilSaya, type ProfilSaya } from "@/lib/akun";
import { useKecamatan, useMuat } from "@/lib/klien";

const TEKS_PERAN: Record<Peran, { label: string; usaha: string; wilayah: string[] }> = {
  penjual: { label: "Penjual", usaha: "Nama kelompok tani / koperasi", wilayah: ["Kab. Garut", "Kota Bandung"] },
  pembeli: { label: "Pembeli", usaha: "Nama usaha", wilayah: ["Kota Bandung", "Kab. Garut"] },
};

interface IsiForm {
  nama: string;
  nama_usaha: string;
  kecamatan_id: string;
  no_hp: string;
}

function dariProfil(p: ProfilSaya): IsiForm {
  return {
    nama: p.nama,
    nama_usaha: p.nama_usaha ?? "",
    kecamatan_id: String(p.kecamatan_id ?? ""),
    no_hp: tampilNoHp(p.no_hp),
  };
}

export function HalamanProfil({ peran }: { peran: Peran }) {
  const { data: profil, galat, memuat, muatUlang } = useMuat(ambilProfilSaya);
  if (memuat) return <Memuat />;
  if (galat || !profil) return <Galat pesan={galat ?? "Profil tidak ditemukan."} ulangi={muatUlang} />;
  return <IsiProfil peran={peran} profilAwal={profil} />;
}

function IsiProfil({ peran, profilAwal }: { peran: Peran; profilAwal: ProfilSaya }) {
  const kecamatan = useKecamatan();
  const teks = TEKS_PERAN[peran];

  const [profil, setProfil] = useState(profilAwal);
  const [form, setForm] = useState(() => dariProfil(profilAwal));
  const awal = dariProfil(profil);
  const [menyimpan, setMenyimpan] = useState(false);
  const [galatSimpan, setGalatSimpan] = useState<string | null>(null);
  const [tersimpan, setTersimpan] = useState(false);

  const berubah = (Object.keys(form) as (keyof IsiForm)[]).filter((k) => form[k].trim() !== awal[k].trim());
  const kec = kecamatan.get(Number(awal.kecamatan_id));
  const daftarKec = [...kecamatan.values()];

  function ubah(k: keyof IsiForm, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    setTersimpan(false);
  }

  async function simpan(e: FormEvent) {
    e.preventDefault();
    if (berubah.length === 0) return;
    setMenyimpan(true);
    setGalatSimpan(null);
    try {
      const kirim: Parameters<typeof ubahProfilSaya>[0] = {};
      if (berubah.includes("nama")) kirim.nama = form.nama.trim();
      if (berubah.includes("nama_usaha")) kirim.nama_usaha = form.nama_usaha.trim();
      if (berubah.includes("kecamatan_id")) kirim.kecamatan_id = Number(form.kecamatan_id);
      if (berubah.includes("no_hp")) kirim.no_hp = form.no_hp.trim();
      const baru = await ubahProfilSaya(kirim);
      setProfil(baru);
      setForm(dariProfil(baru));
      setTersimpan(true);
    } catch (err) {
      setGalatSimpan((err as Error).message);
    } finally {
      setMenyimpan(false);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-3xl leading-tight md:text-4xl">Profil Saya</h1>
        <p className="text-base text-redup">Data ini dipakai untuk pesanan dan pencocokan jarak.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="flex flex-col items-center gap-3 py-7 text-center">
            <span className="flex size-20 items-center justify-center rounded-full bg-terakota font-narrow text-3xl font-bold text-teks">
              {inisial(profil.nama)}
            </span>
            <div className="flex flex-col gap-1">
              <p className="font-serif text-2xl leading-tight">{profil.nama}</p>
              {profil.nama_usaha && <p className="text-redup">{profil.nama_usaha}</p>}
            </div>
            <Badge nada={peran === "penjual" ? "hijau" : "kuning"} ikon={peran === "penjual" ? "tunas" : "toko"}>
              {teks.label}
            </Badge>
            <dl className="mt-2 flex w-full flex-col gap-2 border-t border-garis pt-4 text-left text-sm">
              <div className="flex items-start gap-2">
                <dt className="sr-only">Lokasi</dt>
                <Ikon nama="pin" className="mt-0.5 size-4 text-daun" />
                <dd>{kec ? `${kec.nama}, ${kec.kab_kota}` : "Kecamatan belum diisi"}</dd>
              </div>
              <div className="flex items-start gap-2">
                <dt className="sr-only">Email</dt>
                <Ikon nama="pesan" className="mt-0.5 size-4 text-daun" />
                <dd className="break-all">{profil.email ?? "-"}</dd>
              </div>
              <div className="flex items-start gap-2">
                <dt className="sr-only">Nomor HP</dt>
                <Ikon nama="orang" className="mt-0.5 size-4 text-daun" />
                <dd>{tampilNoHp(profil.no_hp) || "Nomor HP belum diisi"}</dd>
              </div>
            </dl>
          </Card>
          <Link
            href={`/${peran}/pengaturan`}
            className="flex min-h-14 items-center gap-3 rounded-2xl bg-kartu px-5 shadow-sm transition hover:bg-pasir/40"
          >
            <Ikon nama="atur" className="size-5 text-daun" />
            <span className="flex-1">Pengaturan akun</span>
            <Ikon nama="panah" className="size-4 text-redup" />
          </Link>
        </div>

        <Card className="md:p-7">
          <form onSubmit={simpan} className="flex flex-col gap-4">
            <h2 className="font-serif text-xl">Ubah data</h2>
            <Input
              label="Nama Anda"
              value={form.nama}
              onChange={(e) => ubah("nama", e.target.value)}
              autoComplete="name"
              required
              minLength={2}
              maxLength={80}
            />
            <Input
              label={teks.usaha}
              value={form.nama_usaha}
              onChange={(e) => ubah("nama_usaha", e.target.value)}
              maxLength={120}
              petunjuk="Boleh dikosongkan"
            />
            <Field
              label="Kecamatan"
              htmlFor="profil-kecamatan"
              petunjuk={peran === "pembeli" ? "Dipakai untuk menghitung jarak ke penjual." : "Dipakai pembeli untuk melihat jarak ke ladang Anda."}
            >
              <select
                id="profil-kecamatan"
                value={form.kecamatan_id}
                onChange={(e) => ubah("kecamatan_id", e.target.value)}
                required
                className={kelasInput}
              >
                {teks.wilayah.map((w) => (
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
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={form.no_hp}
              onChange={(e) => ubah("no_hp", e.target.value)}
              placeholder="081234567890"
              petunjuk="Hanya terlihat oleh pihak lain setelah pesanan dikonfirmasi."
              required
            />

            {galatSimpan && <Galat pesan={galatSimpan} />}
            {tersimpan && (
              <p role="status" className="flex items-center gap-2 rounded-xl bg-sage px-4 py-3 text-[#4c5a2c]">
                <Ikon nama="centang" /> Profil tersimpan.
              </p>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <Button type="submit" disabled={menyimpan || berubah.length === 0}>
                {menyimpan ? "Menyimpan…" : "Simpan perubahan"}
              </Button>
              {berubah.length > 0 && !menyimpan && (
                <Button varian="kedua" onClick={() => setForm(awal)}>
                  Batal
                </Button>
              )}
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}
