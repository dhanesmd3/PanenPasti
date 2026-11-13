import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Next, Fraunces } from "next/font/google";
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
    <html lang="id" className={`${serif.variable} ${sans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
