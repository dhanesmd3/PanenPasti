// Utilitas tanggal berbasis string "YYYY-MM-DD".
// Semua hitungan memakai UTC supaya selisih hari tidak meleset karena zona waktu.

const MS_PER_HARI = 86_400_000;
const POLA = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Ubah "YYYY-MM-DD" menjadi nomor hari sejak 1970-01-01 (UTC). */
export function keNomorHari(tanggal: string): number {
  const m = POLA.exec(tanggal);
  if (!m) throw new Error(`Format tanggal tidak valid: "${tanggal}"`);
  const hari = Date.UTC(+m[1], +m[2] - 1, +m[3]) / MS_PER_HARI;
  if (dariNomorHari(hari) !== tanggal) {
    throw new Error(`Tanggal tidak ada di kalender: "${tanggal}"`);
  }
  return hari;
}

export function dariNomorHari(hari: number): string {
  return new Date(hari * MS_PER_HARI).toISOString().slice(0, 10);
}

/** a − b dalam hari. Positif jika a lebih lambat dari b. */
export function selisihHari(a: string, b: string): number {
  return keNomorHari(a) - keNomorHari(b);
}

export function tambahHari(tanggal: string, n: number): string {
  return dariNomorHari(keNomorHari(tanggal) + n);
}

/** Tanggal hari Senin di minggu yang sama. */
export function awalMinggu(tanggal: string): string {
  const hari = keNomorHari(tanggal);
  const hariKe = (new Date(hari * MS_PER_HARI).getUTCDay() + 6) % 7; // Senin = 0
  return dariNomorHari(hari - hariKe);
}

/** Bulan 1–12. */
export function bulanDari(tanggal: string): number {
  keNomorHari(tanggal);
  return Number(tanggal.slice(5, 7));
}

const NAMA_HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** Tanggal hari ini di zona WIB (Asia/Jakarta), "YYYY-MM-DD". */
export function hariIniWib(sekarang: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(sekarang);
}

export function namaHari(tanggal: string): string {
  return NAMA_HARI.at(new Date(keNomorHari(tanggal) * MS_PER_HARI).getUTCDay())!;
}

/** "Selasa, 10 November 2026" */
export function tanggalPanjang(tanggal: string): string {
  const [y, m, d] = tanggal.split("-").map(Number);
  keNomorHari(tanggal);
  return `${namaHari(tanggal)}, ${d} ${NAMA_BULAN.at(m - 1)} ${y}`;
}

/** "10 Nov" */
export function tanggalPendek(tanggal: string): string {
  const [, m, d] = tanggal.split("-").map(Number);
  keNomorHari(tanggal);
  return `${d} ${NAMA_BULAN.at(m - 1)!.slice(0, 3)}`;
}
