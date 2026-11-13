// Logo PanenPasti (opsi J3): wordmark "panen" + "pasti" miring, titik huruf i
// diganti tunas dua daun. Huruf memakai Fraunces (font-serif) yang sudah dimuat
// app/layout.tsx; ukurannya ikut font-size, jadi atur lewat className (text-*).
// Ikon kecil yang sama dipakai di app/icon.svg, favicon.ico, dan apple-icon.png.

/** Huruf "i" bertunas: batang ikut warna teks, daun hijau + terakota. Ukuran dalam em. */
function HurufITunas() {
  return (
    <svg
      width="0.48em"
      height="0.8em"
      viewBox="-4 0 48 80"
      aria-hidden
      // Tailwind preflight membuat <svg> display:block; di sini harus sebaris dengan huruf,
      // dengan dasar svg tepat di garis dasar teks.
      className="inline align-baseline"
      // Ruang kosong kiri viewBox (-4) dikompensasi supaya jarak "t" ke "i" sama dengan huruf biasa.
      style={{ marginLeft: "-0.1em" }}
    >
      <path
        d="M19 32 L14.5 68 C14 73.5 17.5 76.5 22 73"
        fill="none"
        stroke="currentColor"
        strokeWidth="7.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M18 28 C15 19 9 14 0 14 C1 23 8 28 18 28 Z" fill="#6f7f52" />
      <path d="M17 22 C18 10 27 3 40 3 C39 15 30 22 17 22 Z" fill="#e3a36e" />
    </svg>
  );
}

export function Logo({ className = "text-[1.65rem]" }: { className?: string }) {
  return (
    <span className={`inline-flex items-baseline font-serif leading-none tracking-[-0.03em] text-teks ${className}`}>
      <span className="sr-only">PanenPasti</span>
      <span aria-hidden>panen</span>
      <span aria-hidden className="whitespace-nowrap italic">
        past
        <HurufITunas />
      </span>
    </span>
  );
}
