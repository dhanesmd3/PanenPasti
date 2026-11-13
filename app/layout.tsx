import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Next, Fraunces } from "next/font/google";
import { SKRIP_UKURAN_TEKS } from "@/lib/ukuran-teks";
import "./globals.css";

// Serif hanya untuk judul & merek. Teks bacaan, tombol, label, dan harga memakai
// Atkinson Hyperlegible: dirancang untuk pembaca berpenglihatan rendah (ramah lansia).
const serif = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["SOFT", "opsz"],
});

const sans = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PanenPasti",
  description:
    "Pre-order hasil panen yang adil: menghubungkan UMKM tani dengan UMKM kuliner.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: atribut data-ukuran-teks dipasang skrip di bawah sebelum React hidrasi.
    <html lang="id" className={`${serif.variable} ${sans.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SKRIP_UKURAN_TEKS }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
