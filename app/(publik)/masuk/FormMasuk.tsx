"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Galat } from "@/components/ui/Keadaan";
import { tandaiTutorial } from "@/components/Tutorial";
import { Ikon } from "@/components/ui/Ikon";
import type { Peran } from "@/types";
import { PanelAuth } from "../PanelAuth";
import { ambilJson } from "@/lib/klien";

// Dibaca langsung supaya halaman tidak perlu Suspense untuk useSearchParams.
const lanjutDariUrl = () => new URLSearchParams(window.location.search).get("lanjut");

export function FormMasuk({ demoAktif }: { demoAktif: boolean }) {
  const [galat, setGalat] = useState<string | null>(null);
  const [mengirim, setMengirim] = useState<"form" | Peran | null>(null);

  async function masukLewat(url: string, body: Record<string, unknown>, sedang: "form" | Peran) {
    setMengirim(sedang);
    setGalat(null);
    try {
      const hasil = await ambilJson<{ lanjut: string }>(url, {
        method: "POST",
        body: JSON.stringify({ ...body, lanjut: lanjutDariUrl() }),
      });
      tandaiTutorial();
      // Muat penuh supaya proxy membaca cookie sesi yang baru.
      window.location.assign(hasil.lanjut);
    } catch (err) {
      setGalat((err as Error).message);
      setMengirim(null);
    }
  }

  function kirim(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    masukLewat("/api/auth/masuk", { email: form.get("email"), password: form.get("password") }, "form");
  }

  return (
    <PanelAuth judul="Selamat datang kembali" teks="Masuk untuk melihat panen dan pesanan Anda.">
      <form onSubmit={kirim} className="flex flex-col gap-4">
        <Input label="Email" name="email" type="email" autoComplete="email" required />
        <Input label="Kata sandi" name="password" type="password" autoComplete="current-password" required />
        {galat && <Galat pesan={galat} />}
        <Button type="submit" penuh disabled={mengirim !== null}>
          {mengirim === "form" ? "Memproses…" : "Masuk"}
        </Button>
      </form>
      {demoAktif && (
        <div className="flex flex-col gap-3">
          <p className="flex items-center gap-3 text-sm text-redup before:h-px before:flex-1 before:bg-garis after:h-px after:flex-1 after:bg-garis">
            atau coba akun demo
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["penjual", "tunas", "Sebagai Penjual"],
                ["pembeli", "toko", "Sebagai Pembeli"],
              ] as const
            ).map(([peran, ikon, label]) => (
              <Button
                key={peran}
                varian="kedua"
                disabled={mengirim !== null}
                onClick={() => masukLewat("/api/auth/demo", { peran }, peran)}
              >
                <Ikon nama={ikon} className="size-5" />
                {mengirim === peran ? "Memproses…" : label}
              </Button>
            ))}
          </div>
        </div>
      )}
      <p className="text-center text-base text-redup">
        Belum punya akun?{" "}
        <Link href="/daftar" className="font-semibold text-daun underline">
          Daftar
        </Link>
      </p>
    </PanelAuth>
  );
}
