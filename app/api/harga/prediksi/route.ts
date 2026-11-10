import { type NextRequest } from "next/server";
import { dataHarga, SUMBER_HARGA } from "@/lib/data/statis";
import { KOMODITAS_DIDUKUNG, susunPrediksi } from "@/lib/harga-prediksi";
import { keNomorHari } from "@/lib/tanggal";

// GET /api/harga/prediksi?komoditas_id=1&tgl_panen=2026-11-28
// Pemilik: D. Bentuk respons: tipe `Prediksi` di types/index.ts.
// Publik (tanpa login): data harga bukan data pribadi.

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const komoditasId = Number(params.get("komoditas_id") ?? KOMODITAS_DIDUKUNG);
  if (komoditasId !== KOMODITAS_DIDUKUNG) {
    return Response.json(
      { error: "Komoditas belum didukung. Saat ini hanya cabai rawit merah (komoditas_id=1)." },
      { status: 404 },
    );
  }

  const tglPanen = params.get("tgl_panen");
  if (tglPanen) {
    try {
      keNomorHari(tglPanen);
    } catch {
      return Response.json(
        { error: "tgl_panen harus berformat YYYY-MM-DD" },
        { status: 400 },
      );
    }
  }

  return Response.json(susunPrediksi(dataHarga(), SUMBER_HARGA, tglPanen));
}
