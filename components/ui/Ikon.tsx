// Set ikon garis (24×24, stroke mengikuti warna teks). Digambar sendiri, tanpa library.

const PATH = {
  rumah: ["M3 10.5 12 3l9 7.5", "M5 9.5V20h14V9.5", "M10 20v-6h4v6"],
  kalender: ["M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z", "M3 10h18", "M8 3v4", "M16 3v4"],
  cari: ["M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z", "m20 20-4-4"],
  paket: ["M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z", "M3 7.5 12 12l9-4.5", "M12 12v9", "m7.5 5.2 9 4.6"],
  lonceng: ["M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z", "M10 21h4"],
  pin: ["M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z", "M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"],
  tunas: ["M12 21v-8", "M12 13C12 9 9 6 4 6c0 4 3 7 8 7z", "M12 11c0-3.5 2.5-6 7-6 0 3.5-2.5 6-7 6z"],
  toko: ["M4 10v10h16V10", "M3 4h18l-1 6H4z", "M9 20v-5h6v5"],
  kilau: ["M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z", "M19 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"],
  pesan: ["M5 4h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4V5a1 1 0 0 1 1-1z"],
  centang: ["m5 12.5 4.5 4.5L19 7"],
  jam: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M12 7v5l3 2"],
  truk: ["M3 6h11v10H3z", "M14 10h4l3 3v3h-7", "M7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z", "M17 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"],
  silang: ["M6 6l12 12", "M18 6 6 18"],
  peringatan: ["M12 3.5 2.5 20h19z", "M12 10v4", "M12 17h.01"],
  api: ["M12 21c-4 0-7-2.8-7-6.5 0-3.2 2.2-5.3 4-7.5.4 2 1.5 3 2.5 3.5C11.5 7 12.5 5 14 3c1 3 5 5.5 5 11.5 0 3.7-3 6.5-7 6.5z"],
  panah: ["M5 12h14", "m13 6 6 6-6 6"],
  kembali: ["M19 12H5", "m11 6-6 6 6 6"],
  keluar: ["M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3", "m10 8-4 4 4 4", "M6 12h10"],
  orang: ["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"],
} as const;

export type NamaIkon = keyof typeof PATH;

export function Ikon({ nama, className = "size-5" }: { nama: NamaIkon; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`shrink-0 ${className}`}
    >
      {PATH[nama].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
