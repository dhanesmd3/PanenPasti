import { Memuat } from "@/components/ui/Keadaan";

// Juga jadi batas Suspense: halaman yang membaca tanggal hari ini dirender per kunjungan, bukan saat build.
export default function Loading() {
  return <Memuat />;
}
