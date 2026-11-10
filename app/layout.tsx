import type { Metadata } from "next";
import { Barlow_Condensed, Fraunces } from "next/font/google";
import "./globals.css";

// Dua suara: serif untuk merek & teks bacaan, sans condensed untuk tombol, label, harga.
const serif = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["SOFT", "opsz"],
});

const narrow = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "PanenPasti",
  description:
    "Pre-order hasil panen yang adil: menghubungkan UMKM tani dengan UMKM kuliner.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${serif.variable} ${narrow.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
