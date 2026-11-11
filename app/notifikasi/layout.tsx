import { HeaderNotifikasi } from "./DaftarNotifikasi";

// Halaman bersama kedua peran: header ringkas yang kembali ke beranda peran pengguna.
export default function Layout({ children }: LayoutProps<"/notifikasi">) {
  return (
    <div className="flex flex-1 flex-col pb-12">
      <HeaderNotifikasi />
      <main className="animasi-muncul mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 md:py-8">
        {children}
      </main>
    </div>
  );
}
