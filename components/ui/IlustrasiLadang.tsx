// Ilustrasi hero: ladang cabai Garut saat senja. SVG buatan sendiri, dekoratif (aria-hidden).

import { useId } from "react";

const DAUN = ["#a3b385", "#8c9d6c", "#b7c49a"];

/** Satu helai daun: elips runcing, diputar di titik pangkalnya. */
function Daun({ x, y, r, s = 1, i = 0 }: { x: number; y: number; r: number; s?: number; i?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <path d="M0 0 C 30 -18, 90 -14, 120 0 C 90 14, 30 18, 0 0 Z" fill={DAUN[i % 3]} />
      <path d="M4 0 H 112" stroke="#6f7f52" strokeWidth="1.5" opacity="0.5" />
    </g>
  );
}

/** Satu cabai menggantung, melengkung ke bawah. */
function Cabai({
  x,
  y,
  r = 0,
  s = 1,
  warna = "#c8482b",
}: {
  x: number;
  y: number;
  r?: number;
  s?: number;
  warna?: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <path d="M0 0 C 10 20, 12 60, -6 96 C 2 62, -6 24, -10 6 Z" fill={warna} />
      <path d="M-2 6 C 2 30, 2 56, -4 80" stroke="#f3b08a" strokeWidth="2" fill="none" opacity="0.5" />
      <path d="M-12 2 Q -4 -10 6 2 Q -2 6 -12 2 Z" fill="#6f7f52" />
      <path d="M-3 -2 Q -2 -14 4 -20" stroke="#6f7f52" strokeWidth="3" fill="none" />
    </g>
  );
}

function KupuKupu({
  x,
  y,
  r = 0,
  s = 1,
  warna,
  tunda = 0,
}: {
  x: number;
  y: number;
  r?: number;
  s?: number;
  warna: string;
  tunda?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <g className="animasi-melayang" style={{ animationDelay: `${tunda}s` }}>
        <path d="M0 0 C -30 -40, -60 -20, -40 4 C -60 20, -30 40, 0 6 Z" fill={warna} />
        <path d="M0 0 C 30 -40, 60 -20, 40 4 C 60 20, 30 40, 0 6 Z" fill={warna} opacity="0.85" />
        <path d="M0 -10 V 18" stroke="#573d21" strokeWidth="4" strokeLinecap="round" />
      </g>
    </g>
  );
}

function Rumpun({ x, y, flip = false }: { x: number; y: number; flip?: boolean }) {
  const daun: [number, number, number, number][] = [
    [0, 0, -30, 1.2],
    [10, 60, 10, 1.1],
    [-20, 130, -10, 1.3],
    [30, 190, 25, 1],
    [0, 260, -20, 1.2],
    [60, 30, -50, 0.9],
    [70, 120, 30, 1],
    [40, 320, 15, 1.1],
    [-10, 380, -25, 1.2],
  ];
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -1.5 : 1.5} 1.5)`}>
      <g className="animasi-bergoyang" style={{ animationDelay: flip ? "-3s" : "0s" }}>
        {daun.map(([dx, dy, r, s], i) => (
          <Daun key={i} x={dx} y={dy} r={r} s={s} i={i} />
        ))}
        <Cabai x={150} y={40} r={-8} s={1.1} />
        <Cabai x={120} y={150} r={12} warna="#d9603a" />
        <Cabai x={175} y={200} r={-4} s={0.9} />
        <Cabai x={110} y={300} r={6} s={1.2} warna="#b83a22" />
      </g>
    </g>
  );
}

export function IlustrasiLadang({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 1440 760" preserveAspectRatio="xMidYMid slice" aria-hidden className={className}>
      <defs>
        <linearGradient id="langit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#efc39b" />
          <stop offset="0.45" stopColor="#e8b893" />
          <stop offset="0.75" stopColor="#c9a3a8" />
        </linearGradient>
        <filter id="serat" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" />
          <feColorMatrix values="0 0 0 0 0.34  0 0 0 0 0.24  0 0 0 0 0.13  0 0 0 0.09 0" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </defs>

      <rect width="1440" height="760" fill="url(#langit)" />
      <circle cx="720" cy="255" r="170" fill="#f7dcae" opacity="0.7" className="animasi-berkilau" />

      {/* Bukit jauh ke dekat */}
      <path
        d="M0 430 C 180 360, 330 390, 470 350 C 610 310, 760 380, 900 340 C 1060 295, 1240 360, 1440 330 V 760 H 0 Z"
        fill="#a1859a"
      />
      <path
        d="M0 480 C 200 430, 380 470, 560 440 C 760 405, 920 470, 1100 440 C 1260 415, 1360 450, 1440 440 V 760 H 0 Z"
        fill="#8a7390"
      />
      <path d="M0 560 C 240 510, 480 540, 720 525 C 960 510, 1200 545, 1440 520 V 760 H 0 Z" fill="#919b6b" />

      {/* Barisan tanaman cabai di lereng */}
      {[575, 615, 660].map((y, baris) =>
        Array.from({ length: 16 }, (_, i) => {
          const x = 40 + i * 92 + (baris % 2) * 46;
          return (
            <g key={`${baris}-${i}`}>
              <ellipse cx={x} cy={y} rx={26 + baris * 4} ry={12 + baris * 2} fill="#6f7f52" opacity="0.85" />
              <circle cx={x - 8} cy={y - 4} r={3 + baris} fill="#c8482b" />
              <circle cx={x + 10} cy={y + 2} r={2.5 + baris} fill="#d9603a" />
            </g>
          );
        }),
      )}
      <path
        d="M0 690 C 300 660, 600 700, 900 680 C 1150 664, 1300 690, 1440 676 V 760 H 0 Z"
        fill="#7b8857"
      />

      {/* Bakul panen di tengah */}
      <g transform="translate(720 245) scale(1.3)">
        <ellipse cx="0" cy="120" rx="150" ry="18" fill="#573d21" opacity="0.18" />
        {[-70, -40, -10, 20, 50, 75].map((x, i) => (
          <Cabai
            key={x}
            x={x}
            y={-30 - (i % 2) * 14}
            r={i * 23 - 60}
            s={0.8}
            warna={i % 2 ? "#d9603a" : "#c8482b"}
          />
        ))}
        <path d="M-130 0 H 130 L 100 115 H -100 Z" fill="#c99a63" />
        {[20, 45, 70, 95].map((y) => (
          <path key={y} d={`M${-130 + y * 0.27} ${y} H ${130 - y * 0.27}`} stroke="#9c6f3e" strokeWidth="4" />
        ))}
        {[-90, -45, 0, 45, 90].map((x) => (
          <path key={x} d={`M${x} 0 L ${x * 0.77} 115`} stroke="#9c6f3e" strokeWidth="3" opacity="0.7" />
        ))}
        <rect x="-140" y="-8" width="280" height="16" fill="#b3854f" />
      </g>

      <KupuKupu x={300} y={250} r={-15} s={1.1} warna="#8c9d6c" />
      <KupuKupu x={1130} y={300} r={20} s={0.8} warna="#efe0c8" tunda={-2} />
      <KupuKupu x={420} y={640} r={10} s={0.9} warna="#c99a63" tunda={-4} />

      <Rumpun x={-40} y={-30} />
      <Rumpun x={1480} y={-10} flip />

      <rect width="1440" height="760" filter="url(#serat)" />
    </svg>
  );
}

// Tiga suasana latar & tiga susunan cabai; dipilih dari id listing supaya grid tidak seragam.
const LATAR_KOMODITAS = [
  ["#f7e3c6", "#e9c9a6", "#f3d6b0"],
  ["#f1e6cf", "#dfe0bd", "#e8e2c2"],
  ["#f6dccf", "#e8bfa8", "#f0cdb8"],
] as const;

const SUSUNAN_CABAI: [number, number, number, number, string][][] = [
  [
    [78, 52, -18, 1.05, "#c8482b"],
    [104, 46, 4, 1.15, "#d9603a"],
    [128, 56, 22, 0.95, "#b83a22"],
  ],
  [
    [70, 60, -30, 1, "#d9603a"],
    [96, 44, -6, 1.2, "#c8482b"],
    [120, 50, 14, 1.05, "#b83a22"],
    [140, 66, 34, 0.85, "#d9603a"],
  ],
  [
    [88, 48, -10, 1.25, "#b83a22"],
    [116, 58, 18, 1.05, "#c8482b"],
  ],
];

// --- Komoditas selain cabai (lib/komoditas.ts). Bentuk sederhana, palet hangat yang sama.

type Pos = { x: number; y: number; r?: number; s?: number };
const ubah = ({ x, y, r = 0, s = 1 }: Pos) => `translate(${x} ${y}) rotate(${r}) scale(${s})`;

function Tomat(p: Pos) {
  return (
    <g transform={ubah(p)}>
      <ellipse cx="0" cy="0" rx="25" ry="22" fill="#cf4a2e" />
      <ellipse cx="-9" cy="-8" rx="7" ry="4" fill="#fff" opacity="0.25" />
      <path d="M0 -26 L3 -19 L11 -21 L5 -15 L9 -9 L0 -13 L-9 -9 L-5 -15 L-11 -21 L-3 -19 Z" fill="#6f7f52" />
    </g>
  );
}

function Kentang(p: Pos) {
  return (
    <g transform={ubah(p)}>
      <path d="M-28 0 C-28 -16 -11 -22 4 -20 C21 -18 29 -8 27 5 C25 17 9 21 -6 20 C-21 19 -28 12 -28 0 Z" fill="#c9a06a" />
      <path d="M-18 -8 C-10 -14 4 -15 12 -11" stroke="#e0c08f" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="-10" cy="2" r="1.8" fill="#8a6338" />
      <circle cx="9" cy="-3" r="1.6" fill="#8a6338" />
      <circle cx="3" cy="10" r="1.6" fill="#8a6338" />
    </g>
  );
}

function Kubis(p: Pos) {
  return (
    <g transform={ubah(p)}>
      <circle r="46" fill="#93ad69" />
      <path d="M-40 14 C-34 -30 34 -30 40 14" stroke="#7d9752" strokeWidth="3" fill="none" />
      <path d="M-30 22 C-26 -14 26 -14 30 22" stroke="#7d9752" strokeWidth="3" fill="none" />
      <circle cy="6" r="20" fill="#c3d69a" />
      <path d="M0 -14 V 26 M0 0 L-10 -8 M0 8 L10 0" stroke="#93ad69" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </g>
  );
}

function Wortel(p: Pos) {
  return (
    <g transform={ubah(p)}>
      <path
        d="M0 -2 C-6 -16 -10 -22 -13 -32 M0 -2 C0 -16 2 -24 0 -36 M0 -2 C6 -14 10 -20 15 -28"
        stroke="#6f7f52"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M-10 0 C-10 -5 10 -5 10 0 L2 66 C1 70 -1 70 -2 66 Z" fill="#e2852f" />
      <path d="M-7 16 h6 M2 30 h5 M-5 44 h5" stroke="#c26a1c" strokeWidth="2" strokeLinecap="round" />
    </g>
  );
}

function Bawang(p: Pos) {
  return (
    <g transform={ubah(p)}>
      <path d="M0 -28 C4 -15 21 -9 21 8 C21 22 11 28 0 28 C-11 28 -21 22 -21 8 C-21 -9 -4 -15 0 -28 Z" fill="#a8445a" />
      <path d="M0 -26 C-4 -10 -4 12 0 27" stroke="#7d2a3e" strokeWidth="1.5" fill="none" opacity="0.5" />
      <path d="M-8 -2 C-6 -10 -3 -14 -2 -18" stroke="#fff" strokeWidth="3" fill="none" opacity="0.2" strokeLinecap="round" />
      <path d="M-3 28 l-3 6 M0 28 v7 M3 28 l3 6" stroke="#d9c3a5" strokeWidth="1.5" strokeLinecap="round" />
    </g>
  );
}

/** Gambar per komoditas; null = pakai tunas (komoditas lain). Dua susunan, dipilih dari benih. */
function SusunanKomoditas({ nama, n }: { nama: string; n: number }) {
  const v = n % 2;
  if (/tomat/i.test(nama)) {
    return (
      <g>
        <Daun x={36} y={140} r={-20} s={0.9} i={n} />
        {(v ? [[78, 86, 1], [124, 92, 0.9], [100, 128, 1.1]] : [[90, 100, 1.2], [132, 112, 0.85]]).map(([x, y, s]) => (
          <Tomat key={`${x}-${y}`} x={x} y={y} s={s} />
        ))}
      </g>
    );
  }
  if (/kentang/i.test(nama)) {
    return (
      <g>
        {(v ? [[76, 92, -12, 1], [126, 104, 18, 0.9], [96, 132, 4, 1.1]] : [[88, 100, -6, 1.25], [134, 124, 22, 0.85], [62, 130, 10, 0.8]]).map(
          ([x, y, r, s]) => <Kentang key={`${x}-${y}`} x={x} y={y} r={r} s={s} />,
        )}
      </g>
    );
  }
  if (/kubis|kol\b/i.test(nama)) {
    return (
      <g>
        <Daun x={30} y={150} r={-25} s={0.9} i={n} />
        <Kubis x={100} y={104} s={v ? 1 : 1.1} />
      </g>
    );
  }
  if (/wortel/i.test(nama)) {
    return (
      <g>
        {(v ? [[74, 62, -24, 1], [102, 56, 0, 1.1], [128, 64, 22, 0.95]] : [[88, 58, -12, 1.15], [118, 62, 14, 1.05]]).map(
          ([x, y, r, s]) => <Wortel key={`${x}-${y}`} x={x} y={y} r={r} s={s} />,
        )}
      </g>
    );
  }
  if (/bawang/i.test(nama)) {
    return (
      <g>
        {(v ? [[80, 94, -14, 1], [122, 96, 12, 0.95], [100, 124, 0, 1.15]] : [[90, 100, -8, 1.3], [132, 112, 16, 0.9]]).map(
          ([x, y, r, s]) => <Bawang key={`${x}-${y}`} x={x} y={y} r={r} s={s} />,
        )}
      </g>
    );
  }
  return null;
}

function angkaDari(benih: string): number {
  let h = 0;
  for (const c of benih) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

/** Gambar pengganti foto listing: gambar sesuai komoditas, atau tunas untuk komoditas lain. */
export function GambarKomoditas({
  nama,
  benih = "",
  className = "",
}: {
  nama: string;
  benih?: string;
  className?: string;
}) {
  const cabai = /cabai|cabe/i.test(nama);
  const keriting = /keriting/i.test(nama); // cabai merah keriting: lebih panjang, merah tua
  const idLatar = useId();
  const n = angkaDari(benih);
  const [terang, gelap, lingkar] = LATAR_KOMODITAS[n % 3];
  const susunan = SUSUNAN_CABAI[Math.floor(n / 3) % 3];
  return (
    <svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" aria-hidden className={className}>
      <defs>
        <radialGradient id={idLatar} cx="0.5" cy="0.35" r="0.8">
          <stop offset="0" stopColor={terang} />
          <stop offset="1" stopColor={gelap} />
        </radialGradient>
      </defs>
      <rect width="200" height="200" fill={`url(#${idLatar})`} />
      <circle cx="100" cy="92" r="62" fill={lingkar} />
      {cabai ? (
        <g>
          <Daun x={40} y={135} r={-18} s={1.05} i={n} />
          <Daun x={60} y={150} r={-35} s={0.8} i={n + 2} />
          {susunan.map(([x, y, r, sk, warna]) => (
            <Cabai key={`${x}-${y}`} x={x} y={y} r={r} s={keriting ? sk * 1.12 : sk} warna={keriting ? "#9e2a1c" : warna} />
          ))}
        </g>
      ) : /tomat|kentang|kubis|kol\b|wortel|bawang/i.test(nama) ? (
        <SusunanKomoditas nama={nama} n={n} />
      ) : (
        <g transform="translate(100 150)">
          <path d="M0 0 V -70" stroke="#6f7f52" strokeWidth="5" strokeLinecap="round" />
          <Daun x={0} y={-40} r={-150} s={0.6} i={n} />
          <Daun x={0} y={-58} r={-30} s={0.6} i={n + 1} />
          <ellipse cx="0" cy="4" rx="46" ry="8" fill="#9c6f3e" opacity="0.4" />
        </g>
      )}
    </svg>
  );
}
