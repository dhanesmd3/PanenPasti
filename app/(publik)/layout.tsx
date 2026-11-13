import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

const kelasMenu =
  "label-cetak rounded-full px-3.5 py-2 text-sm text-redup transition hover:bg-pasir/50 hover:text-teks";

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col">
      <p className="label-cetak bg-aprikot px-4 py-1.5 text-center text-xs">
        Musim panen Garut · pre-order dibuka sekarang
      </p>
      <header className="sticky top-0 z-20 border-b border-garis/70 bg-kartu/95 backdrop-blur">
        <div className="mx-auto grid h-16 max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4">
          <nav className="hidden items-center gap-2 sm:flex">
            <Link href="/#cara-kerja" className={kelasMenu}>
              Cara kerja
            </Link>
            <Link href="/tentang" className={kelasMenu}>
              Tentang
            </Link>
          </nav>
          <Link href="/" className="col-start-2 leading-none">
            <Logo />
          </Link>
          <nav className="flex items-center justify-end gap-1">
            <Link href="/masuk" className={kelasMenu}>
              Masuk
            </Link>
            <Link
              href="/daftar"
              className="label-cetak rounded-full bg-terakota px-4 py-2 text-sm text-teks transition hover:bg-aprikot"
            >
              Daftar
            </Link>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
