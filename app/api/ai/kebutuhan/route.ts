import { idPenggunaOpsional } from "@/lib/supabase/server";
import { z } from "zod";
import { ekstrakKebutuhan } from "@/lib/ai/fitur/kebutuhan";
import { bacaJson, cekBatasAI, gagal, LABEL_AI, responsGalatAI } from "@/lib/ai/respons";
import { hariIniWib } from "@/lib/tanggal";

// POST /api/ai/kebutuhan  (AI-1)  Pemilik: D
// Body:   { "teks": "butuh 20 kg cabai rawit tiap Senin" }
// Sukses: { ok: true, data: KebutuhanAI, label }
// Gagal:  GagalAI → tampilkan form manual jika pakai_form_manual = true

const Masukan = z.object({ teks: z.string().trim().min(3).max(300) });

export async function POST(request: Request) {
  const masukan = Masukan.safeParse(await bacaJson(request));
  if (!masukan.success) {
    return gagal("Tulis kebutuhan Anda (3–300 karakter).", 400);
  }

  const dibatasi = cekBatasAI(request.headers, await idPenggunaOpsional());
  if (dibatasi) return dibatasi;

  try {
    const hasil = await ekstrakKebutuhan(masukan.data.teks, hariIniWib());
    if (!hasil.ok) {
      return gagal("Komoditas itu belum tersedia di PanenPasti. Pilih komoditas dari daftar di form.", 422);
    }
    return Response.json({ ok: true, data: hasil.data, label: LABEL_AI });
  } catch (e) {
    return responsGalatAI(e);
  }
}
