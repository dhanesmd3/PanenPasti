import { type NextRequest } from "next/server";
import { z } from "zod";
import { hasilkanJson } from "@/lib/ai/hasilkan-json";
import { ambilProviderAI, GalatAI } from "@/lib/ai/provider";

// Endpoint uji koneksi AI. HANYA aktif di development (npm run dev),
// supaya kuota AI tidak bisa dihabiskan orang lain lewat deployment publik.
// Contoh: http://localhost:3000/api/ai/tes?teks=butuh 20 kg cabai rawit tiap senin

const SkemaTes = z.object({
  komoditas: z.string(),
  jumlah_kg: z.number().positive(),
  catatan: z.string(),
});

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "Tidak ditemukan" }, { status: 404 });
  }

  const teks =
    request.nextUrl.searchParams.get("teks") ??
    "butuh 20 kg cabai rawit merah tiap Senin buat warung";

  try {
    const provider = ambilProviderAI();
    const hasil = await hasilkanJson(
      SkemaTes,
      {
        sistem:
          "Ekstrak kebutuhan bahan baku dari teks berbahasa Indonesia. 1 kuintal = 100 kg, 1 ons = 0,1 kg.",
        prompt: teks,
      },
      provider,
    );
    return Response.json({
      provider: provider.nama,
      model: provider.model,
      masukan: teks,
      hasil,
    });
  } catch (e) {
    if (e instanceof GalatAI) {
      return Response.json(
        { error: e.message, jenis: e.jenis },
        { status: e.jenis === "kuota" ? 429 : e.jenis === "konfigurasi" ? 500 : 502 },
      );
    }
    throw e;
  }
}
