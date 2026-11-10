import type { ReactNode } from "react";
import type { OrderStatus } from "@/types";
import { LABEL_STATUS } from "@/lib/pesanan";
import { Ikon, type NamaIkon } from "./Ikon";

export type NadaBadge = "netral" | "hijau" | "kuning" | "merah" | "biru";

const NADA: Record<NadaBadge, string> = {
  netral: "bg-pasir/60 text-teks",
  hijau: "bg-sage text-[#4c5a2c]",
  kuning: "bg-kunyit-muda text-kunyit",
  merah: "bg-cabai-muda text-cabai",
  biru: "bg-pasir text-teks",
};

export function Badge({ nada = "netral", ikon, children }: { nada?: NadaBadge; ikon?: NamaIkon; children: ReactNode }) {
  return (
    <span className={`label-cetak inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs ${NADA[nada]}`}>
      {ikon && <Ikon nama={ikon} className="size-3.5" />}
      {children}
    </span>
  );
}

// Status selalu tampil dengan warna + ikon + teks (PRD 5.1), jadi tidak bergantung pada warna saja.
const TAMPILAN_STATUS: Record<OrderStatus, { nada: NadaBadge; ikon: NamaIkon }> = {
  menunggu: { nada: "kuning", ikon: "jam" },
  dikonfirmasi: { nada: "biru", ikon: "centang" },
  dikirim: { nada: "biru", ikon: "truk" },
  selesai: { nada: "hijau", ikon: "centang" },
  ditolak: { nada: "merah", ikon: "silang" },
  dibatalkan: { nada: "netral", ikon: "silang" },
  gagal_panen: { nada: "merah", ikon: "peringatan" },
};

export function BadgeStatus({ status }: { status: OrderStatus }) {
  const { nada, ikon } = TAMPILAN_STATUS[status];
  return (
    <Badge nada={nada} ikon={ikon}>
      {LABEL_STATUS[status]}
    </Badge>
  );
}
