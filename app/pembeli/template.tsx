// Template dipasang ulang setiap pindah halaman, jadi isi halaman muncul dengan gerak halus.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animasi-muncul flex flex-col gap-6">{children}</div>;
}
