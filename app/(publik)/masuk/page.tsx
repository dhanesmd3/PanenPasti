"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Galat } from "@/components/ui/Keadaan";
import { PanelAuth } from "../PanelAuth";
import { ambilJson } from "@/lib/klien";

export default function Page() {
  const [galat, setGalat] = useState<string | null>(null);
  const [mengirim, setMengirim] = useState(false);

  async function kirim(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setMengirim(true);
    setGalat(null);
    try {
      const hasil = await ambilJson<{ lanjut: string }>("/api/auth/masuk", {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
          // Dibaca langsung supaya halaman tidak perlu Suspense untuk useSearchParams.
          lanjut: new URLSearchParams(window.location.search).get("lanjut"),
        }),
      });
      // Muat penuh supaya proxy membaca cookie sesi yang baru.
      window.location.assign(hasil.lanjut);
    } catch (err) {
      setGalat((err as Error).message);
      setMengirim(false);
    }
  }

  return (
    <PanelAuth judul="Selamat datang kembali" teks="Masuk untuk melihat panen dan pesanan Anda.">
      <form onSubmit={kirim} className="flex flex-col gap-4">
        <Input label="Email" name="email" type="email" autoComplete="email" required />
        <Input label="Kata sandi" name="password" type="password" autoComplete="current-password" required />
        {galat && <Galat pesan={galat} />}
        <Button type="submit" penuh disabled={mengirim}>
          {mengirim ? "Memproses…" : "Masuk"}
        </Button>
      </form>
      <p className="text-center text-base text-redup">
        Belum punya akun?{" "}
        <Link href="/daftar" className="font-semibold text-daun underline">
          Daftar
        </Link>
      </p>
    </PanelAuth>
  );
}
