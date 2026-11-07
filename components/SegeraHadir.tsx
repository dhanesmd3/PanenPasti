// Penanda halaman yang belum dibangun. Hapus pemakaiannya saat halaman dikerjakan.
export default function SegeraHadir({
  judul,
  pemilik,
}: {
  judul: string;
  pemilik: "A" | "B" | "C" | "D";
}) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-2 p-4">
      <h1 className="text-xl font-semibold">{judul}</h1>
      <p className="text-base text-zinc-600 dark:text-zinc-400">
        Segera hadir. Dikerjakan oleh {pemilik}.
      </p>
    </main>
  );
}
