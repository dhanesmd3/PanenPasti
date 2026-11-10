"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { Listing, Order } from "@/types";
import { Button, kelasTombol } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Galat } from "@/components/ui/Keadaan";
import { Ikon } from "@/components/ui/Ikon";
import { ambilJson } from "@/lib/klien";
import { formatKg, formatRupiah } from "@/lib/format";
import { hargaBerlaku } from "./listing";

export function FormPreOrder({
  listing,
  jumlahAwal,
  kebutuhanId,
}: {
  listing: Listing;
  jumlahAwal?: number;
  kebutuhanId?: string | null;
}) {
  const [jumlah, setJumlah] = useState(String(Math.min(jumlahAwal ?? 10, listing.sisa_kg)));
  const [galat, setGalat] = useState<string | null>(null);
  const [mengirim, setMengirim] = useState(false);
  const [berhasil, setBerhasil] = useState<Order | null>(null);

  const kg = Number(jumlah);
  const galatJumlah =
    jumlah === "" || !(kg > 0)
      ? "Isi jumlah lebih dari 0 kg."
      : kg > listing.sisa_kg
        ? `Sisa stok hanya ${formatKg(listing.sisa_kg)}.`
        : null;

  async function kirim(e: FormEvent) {
    e.preventDefault();
    if (galatJumlah) return;
    setMengirim(true);
    setGalat(null);
    try {
      const order = await ambilJson<Order>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          listing_id: listing.id,
          jumlah_kg: kg,
          kebutuhan_id: kebutuhanId ?? undefined,
        }),
      });
      setBerhasil(order);
    } catch (err) {
      setGalat((err as Error).message);
    } finally {
      setMengirim(false);
    }
  }

  if (berhasil) {
    return (
      <div role="status" className="flex flex-col items-center gap-3 rounded-2xl bg-sage/70 p-5 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-kartu text-[#4c5a2c]">
          <Ikon nama="centang" className="size-6" />
        </span>
        <p className="font-serif text-lg leading-snug">Pre-order {formatKg(berhasil.jumlah_kg)} terkirim</p>
        <p className="text-sm text-redup">Menunggu konfirmasi penjual.</p>
        <Link href="/pembeli/pesanan" className={kelasTombol("utama", true)}>
          Lihat Pesanan Saya
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={kirim} className="flex flex-col gap-4">
      <Input
        label="Jumlah (kg)"
        type="number"
        inputMode="decimal"
        min={0.1}
        step={0.1}
        max={listing.sisa_kg}
        value={jumlah}
        onChange={(e) => setJumlah(e.target.value)}
        galat={jumlah === "" ? null : galatJumlah}
        petunjuk={`Sisa stok ${formatKg(listing.sisa_kg)}`}
      />
      <div className="flex items-baseline justify-between border-t border-garis/70 pt-3">
        <span className="text-sm text-redup">Perkiraan total</span>
        <span className="font-narrow text-2xl font-bold">
          {galatJumlah ? "—" : formatRupiah(kg * hargaBerlaku(listing))}
        </span>
      </div>
      {galat && <Galat pesan={galat} />}
      <Button type="submit" penuh disabled={mengirim || !!galatJumlah}>
        {mengirim ? "Mengirim…" : "Pre-order"}
      </Button>
    </form>
  );
}
