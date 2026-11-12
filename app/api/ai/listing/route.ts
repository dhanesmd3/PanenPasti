import { idPenggunaOpsional } from "@/lib/supabase/server";
import { z } from "zod";
import { ekstrakListing } from "@/lib/ai/fitur/listing";
import { bacaJson, cekBatasAI, gagal, LABEL_AI, responsGalatAI } from "@/lib/ai/respons";
import { hariIniWib } from "@/lib/tanggal";

// POST /api/ai/listing  (AI-2)  Pemilik: D
// Body:   { "teks": "cabai rawit 5 kuintal panen akhir bulan, bagus, 35 ribu" }
// Sukses: { ok: true, data: ListingAI, label }
// Gagal:  GagalAI → tampilkan form manual jika pakai_form_manual = true

const Masukan = z.object({ teks: z.string().trim().min(3).max(300) });

export async function POST(request: Request) {
  const masukan = Masukan.safeParse(await bacaJson(request));
  if (!masukan.success) {
    return gagal("Tulis keterangan panen Anda (3–300 karakter).", 400);
  }

  const dibatasi = cekBatasAI(request.headers, await idPenggunaOpsional());
  if (dibatasi) return dibatasi;

  try {
    const hasil = await ekstrakListing(masukan.data.teks, hariIniWib());
    if (!hasil.ok) {
      return gagal("Komoditas itu belum tersedia di PanenPasti. Pilih komoditas dari daftar di form.", 422);
    }
    return Response.json({ ok: true, data: hasil.data, label: LABEL_AI });
  } catch (e) {
    return responsGalatAI(e);
  }
}
