"use client";

import { JudulHalaman, TautanKembali } from "@/components/penjual/bersama";
import { FormPanen } from "@/components/penjual/FormPanen";

export default function Page() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <TautanKembali href="/penjual/panen">Panen Saya</TautanKembali>
      <JudulHalaman judul="Tambah panen" sub="Isi sebisanya. Semua bisa diubah lagi nanti." />
      <FormPanen />
    </div>
  );
}
