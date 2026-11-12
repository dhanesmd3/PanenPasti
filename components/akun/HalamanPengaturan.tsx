"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import type { Peran } from "@/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Ikon, type NamaIkon } from "@/components/ui/Ikon";
import { Input } from "@/components/ui/Input";
import { Galat } from "@/components/ui/Keadaan";
import { ambilJson } from "@/lib/klien";
import { bacaUkuranTeks, pasangUkuranTeks, UKURAN_TEKS, type UkuranTeks } from "@/lib/ukuran-teks";

function Bagian({ ikon, judul, sub, children }: { ikon: NamaIkon; judul: string; sub: string; children: ReactNode }) {
  return (
    <Card className="flex flex-col gap-4 md:p-7">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-pasir text-daun">
          <Ikon nama={ikon} />
        </span>
        <div className="flex flex-col">
          <h2 className="font-serif text-xl leading-tight">{judul}</h2>
          <p className="text-sm text-redup">{sub}</p>
        </div>
      </div>
      {children}
    </Card>
  );
}

// Ukuran teks hidup di localStorage + atribut <html>; dibaca lewat useSyncExternalStore
// supaya render server ("normal") dan browser tidak bentrok saat hidrasi.
const pendengarUkuran = new Set<() => void>();
function langgananUkuran(f: () => void) {
  pendengarUkuran.add(f);
  return () => pendengarUkuran.delete(f);
}

function PilihUkuranTeks() {
  const ukuran = useSyncExternalStore(langgananUkuran, bacaUkuranTeks, () => "normal" as UkuranTeks);

  function pilih(u: UkuranTeks) {
    pasangUkuranTeks(u);
    pendengarUkuran.forEach((f) => f());
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="sr-only">Ukuran teks</legend>
      <div className="grid grid-cols-3 gap-3">
        {UKURAN_TEKS.map((u) => (
          <label
            key={u.nilai}
            className={`flex cursor-pointer flex-col items-center gap-1 rounded-2xl px-2 py-4 text-center ring-1 transition has-focus-visible:outline-2 has-focus-visible:outline-daun ${
              ukuran === u.nilai ? "bg-pasir/70 ring-2 ring-terakota" : "bg-latar/60 ring-garis hover:bg-pasir/40"
            }`}
          >
            <input
              type="radio"
              name="ukuran-teks"
              value={u.nilai}
              checked={ukuran === u.nilai}
              onChange={() => pilih(u.nilai)}
              className="sr-only"
            />
            <span aria-hidden className={`font-serif leading-none ${u.contoh}`}>
              Aa
            </span>
            <span className="label-cetak text-xs text-redup">{u.label}</span>
          </label>
        ))}
      </div>
      <p className="text-sm text-redup">
        Berlaku langsung di perangkat ini. Pilih yang paling nyaman dibaca, terutama di HP.
      </p>
    </fieldset>
  );
}

function GantiKataSandi() {
  const [buka, setBuka] = useState(false);
  const [mengirim, setMengirim] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [berhasil, setBerhasil] = useState(false);

  async function kirim(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formulir = e.currentTarget;
    const f = new FormData(formulir);
    const baru = String(f.get("baru") ?? "");
    if (baru !== f.get("ulangi")) return setGalat("Ulangi kata sandi baru tidak sama.");
    setMengirim(true);
    setGalat(null);
    try {
      await ambilJson("/api/auth/kata-sandi", {
        method: "POST",
        body: JSON.stringify({ lama: f.get("lama"), baru }),
      });
      formulir.reset();
      setBerhasil(true);
      setBuka(false);
    } catch (err) {
      setGalat((err as Error).message);
    } finally {
      setMengirim(false);
    }
  }

  if (!buka) {
    return (
      <div className="flex flex-col items-start gap-3">
        {berhasil && (
          <p role="status" className="flex items-center gap-2 rounded-xl bg-sage px-4 py-3 text-[#4c5a2c]">
            <Ikon nama="centang" /> Kata sandi berhasil diganti.
          </p>
        )}
        <Button
          varian="kedua"
          onClick={() => {
            setBuka(true);
            setBerhasil(false);
          }}
        >
          Ganti kata sandi
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={kirim} className="flex flex-col gap-4">
      <Input label="Kata sandi sekarang" name="lama" type="password" autoComplete="current-password" required />
      <Input
        label="Kata sandi baru"
        name="baru"
        type="password"
        autoComplete="new-password"
        minLength={8}
        maxLength={72}
        petunjuk="Minimal 8 karakter"
        required
      />
      <Input label="Ulangi kata sandi baru" name="ulangi" type="password" autoComplete="new-password" required />
      {galat && <Galat pesan={galat} />}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={mengirim}>
          {mengirim ? "Menyimpan…" : "Simpan kata sandi"}
        </Button>
        <Button
          varian="kedua"
          onClick={() => {
            setBuka(false);
            setGalat(null);
          }}
        >
          Batal
        </Button>
      </div>
    </form>
  );
}

function Tautan({ href, ikon, children }: { href: string; ikon: NamaIkon; children: ReactNode }) {
  return (
    <Link href={href} className="flex min-h-12 items-center gap-3 rounded-xl px-3 transition hover:bg-pasir/50">
      <Ikon nama={ikon} className="size-5 text-daun" />
      <span className="flex-1">{children}</span>
      <Ikon nama="panah" className="size-4 text-redup" />
    </Link>
  );
}

export function HalamanPengaturan({ peran }: { peran: Peran }) {
  const router = useRouter();
  const [keluar, setKeluar] = useState(false);

  async function keluarAkun() {
    setKeluar(true);
    await fetch("/api/auth/keluar", { method: "POST" }).catch(() => null);
    router.replace("/");
    router.refresh();
  }

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-3xl leading-tight md:text-4xl">Pengaturan</h1>
        <p className="text-base text-redup">Atur tampilan dan keamanan akun Anda.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Bagian ikon="huruf" judul="Ukuran teks" sub="Perbesar huruf dan tombol di seluruh aplikasi.">
          <PilihUkuranTeks />
        </Bagian>

        <Bagian ikon="gembok" judul="Keamanan" sub="Kata sandi untuk masuk ke PanenPasti.">
          <GantiKataSandi />
        </Bagian>

        <Bagian ikon="orang" judul="Akun" sub="Data diri, notifikasi, dan informasi aplikasi.">
          <nav className="-mx-3 flex flex-col">
            <Tautan href={`/${peran}/profil`} ikon="pensil">
              Ubah profil
            </Tautan>
            <Tautan href="/notifikasi" ikon="lonceng">
              Notifikasi
            </Tautan>
            <Tautan href="/tentang" ikon="kilau">
              Tentang, privasi & penggunaan AI
            </Tautan>
          </nav>
        </Bagian>

        <Bagian ikon="keluar" judul="Keluar" sub="Akhiri sesi di perangkat ini.">
          <div>
            <Button varian="bahaya" onClick={keluarAkun} disabled={keluar}>
              <Ikon nama="keluar" /> {keluar ? "Keluar…" : "Keluar dari akun"}
            </Button>
          </div>
        </Bagian>
      </div>
    </>
  );
}
