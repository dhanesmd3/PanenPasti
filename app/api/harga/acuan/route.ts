import { dataHarga, SUMBER_HARGA } from "@/lib/data/statis";
import { susunHargaAcuan } from "@/lib/harga-acuan";
import type { BarisHarga } from "@/lib/harga-csv";
import { KOMODITAS_DIDUKUNG } from "@/lib/harga-prediksi";
import type { HargaAcuan } from "@/types";

// GET /api/harga/acuan
// Harga pasar terbaru per komoditas (Rp/kg), pembanding harga di katalog pembeli.
// Respons: HargaAcuan[] (types/index.ts). Komoditas tanpa data harga tidak ikut.
// Publik (tanpa login): data harga bukan data pribadi.
//
// Saat ini hanya cabai rawit merah yang punya data PIHPS (data/harga). Komoditas
// lain menyusul dengan menambah CSV-nya dan satu baris di SUMBER di bawah.

const SUMBER: { komoditasId: number; data: () => BarisHarga[] }[] = [
  { komoditasId: KOMODITAS_DIDUKUNG, data: dataHarga },
];

export async function GET() {
  const hasil = SUMBER.map((s) => susunHargaAcuan(s.komoditasId, s.data(), SUMBER_HARGA)).filter(
    (h): h is HargaAcuan => h !== null,
  );
  return Response.json(hasil);
}
