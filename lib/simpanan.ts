// Baca-tulis localStorage / sessionStorage yang tidak melempar galat.
// Penyimpanan bisa diblokir (mode privat, cookie dimatikan): fitur tetap jalan,
// hanya tidak diingat.

type Jenis = "lokal" | "sesi";

const simpanan = (jenis: Jenis): Storage => (jenis === "lokal" ? localStorage : sessionStorage);

export function bacaSimpanan(jenis: Jenis, kunci: string): string | null {
  try {
    return simpanan(jenis).getItem(kunci);
  } catch {
    return null;
  }
}

/** `nilai` null menghapus kunci. */
export function tulisSimpanan(jenis: Jenis, kunci: string, nilai: string | null): void {
  try {
    if (nilai === null) simpanan(jenis).removeItem(kunci);
    else simpanan(jenis).setItem(kunci, nilai);
  } catch {
    // Diabaikan dengan sengaja, lihat komentar di atas.
  }
}
