"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ikon, type NamaIkon } from "@/components/ui/Ikon";

// PRD 5.1: menu sedikit, ikon besar + label, bahasa sehari-hari.
const MENU: { href: string; label: string; ikon: NamaIkon }[] = [
  { href: "/penjual", label: "Beranda", ikon: "rumah" },
  { href: "/penjual/panen", label: "Panen", ikon: "tunas" },
  { href: "/penjual/pesanan", label: "Pesanan", ikon: "paket" },
  { href: "/penjual/harga", label: "Harga", ikon: "grafik" },
];

function useAktif() {
  const path = usePathname();
  return (href: string) => (href === "/penjual" ? path === href : path.startsWith(href));
}

/** Menu di header, hanya layar lebar. */
export function NavAtas() {
  const aktif = useAktif();
  return (
    <nav aria-label="Menu penjual" className="hidden items-center gap-1 lg:flex">
      {MENU.map((m) => (
        <Link
          key={m.href}
          href={m.href}
          aria-current={aktif(m.href) ? "page" : undefined}
          className={`label-cetak rounded-full px-3.5 py-2 text-sm transition ${
            aktif(m.href) ? "bg-pasir text-teks" : "text-redup hover:bg-pasir/50 hover:text-teks"
          }`}
        >
          {m.label}
        </Link>
      ))}
    </nav>
  );
}

/** Navigasi bawah, hanya di HP & tablet. */
export function NavBawah() {
  const aktif = useAktif();
  return (
    <nav
      aria-label="Menu penjual"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-garis bg-kartu/95 backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {MENU.map((m) => (
          <li key={m.href}>
            <Link
              href={m.href}
              aria-current={aktif(m.href) ? "page" : undefined}
              className={`label-cetak flex min-h-16 flex-col items-center justify-center gap-1 text-xs ${
                aktif(m.href) ? "text-daun" : "text-redup"
              }`}
            >
              <span className={`rounded-full px-4 py-1 ${aktif(m.href) ? "bg-pasir" : ""}`}>
                <Ikon nama={m.ikon} className="size-6" />
              </span>
              {m.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
