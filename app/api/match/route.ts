import { z } from "zod";
import { bacaJson } from "@/lib/ai/respons";
import { cariKecamatan } from "@/lib/data/statis";
import { bangunKandidat, KOLOM_LISTING_MATCH, type BarisListingDb } from "@/lib/kandidat";
import { cocokkan, MAKS_SELISIH_HARI } from "@/lib/matching";
import { sesiOpsional, supabaseTerkonfigurasi } from "@/lib/supabase/server";
import { keNomorHari, tambahHari } from "@/lib/tanggal";

// POST /api/match  Pemilik: D  (wajib login; 401 untuk tamu)
// Body: {
//   komoditas_id: 1, jumlah_kg: 100, tgl_butuh: "2026-11-28",
//   kecamatan_id?: 3273230,          // lokasi pembeli; default: kecamatan di profil
//   kecualikan_listing?: ["uuid"],   // untuk saran penjual pengganti (gagal panen)
//   batas?: 10
// }
// Sukses: { hasil: HasilMatching[] }

const TanggalIso = z.string().refine((t) => {
  try {
    keNomorHari(t);
    return true;
  } catch {
    return false;
  }
}, "Format YYYY-MM-DD");

const Masukan = z.object({
  komoditas_id: z.number().int().positive(),
  jumlah_kg: z.number().positive().max(100_000),
  tgl_butuh: TanggalIso,
  kecamatan_id: z.number().int().optional(),
  kecualikan_listing: z.array(z.string()).max(50).optional(),
  batas: z.number().int().min(1).max(20).default(10),
});

export async function POST(request: Request) {
  const masukan = Masukan.safeParse(await bacaJson(request));
  if (!masukan.success) {
    return Response.json({ error: z.prettifyError(masukan.error) }, { status: 400 });
  }
  const m = masukan.data;

  if (!supabaseTerkonfigurasi()) {
    return Response.json({ error: "Database belum dikonfigurasi" }, { status: 503 });
  }
  // Tabel listings hanya bisa dibaca pengguna yang login (RLS), jadi tamu
  // langsung diberi 401 yang jelas, bukan 500 "permission denied".
  const sesi = await sesiOpsional();
  if (!sesi) {
    return Response.json({ error: "Masuk terlebih dahulu" }, { status: 401 });
  }
  const { supabase } = sesi;

  // Lokasi pembeli: dari body, atau dari profil pengguna yang login.
  let kecamatanId = m.kecamatan_id;
  if (kecamatanId == null) {
    const { data: profil } = await supabase
      .from("profiles")
      .select("kecamatan_id")
      .eq("id", sesi.userId)
      .single();
    kecamatanId = profil?.kecamatan_id ?? undefined;
  }
  const lokasiPembeli = kecamatanId == null ? undefined : cariKecamatan(kecamatanId);
  if (!lokasiPembeli) {
    return Response.json({ error: "Kecamatan pembeli tidak dikenal" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("listings")
    .select(KOLOM_LISTING_MATCH)
    .eq("komoditas_id", m.komoditas_id)
    .neq("status", "habis")
    .gt("sisa_kg", 0)
    .gte("tgl_panen", tambahHari(m.tgl_butuh, -MAKS_SELISIH_HARI))
    .lte("tgl_panen", tambahHari(m.tgl_butuh, MAKS_SELISIH_HARI))
    .limit(200);
  if (error) {
    console.error("[match]", error.message);
    return Response.json({ error: "Gagal mengambil data listing" }, { status: 500 });
  }

  const hasil = cocokkan(
    {
      komoditas_id: m.komoditas_id,
      jumlah_kg: m.jumlah_kg,
      tgl_butuh: m.tgl_butuh,
      lokasi: { lat: lokasiPembeli.lat, lng: lokasiPembeli.lng },
    },
    bangunKandidat((data ?? []) as unknown as BarisListingDb[], cariKecamatan),
    { kecualikanListing: m.kecualikan_listing, batas: m.batas },
  );
  return Response.json({ hasil });
}
