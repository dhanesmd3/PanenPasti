import { dariGalatDb, sesiWajib } from "@/lib/api";

// GET /api/notifikasi/jumlah   Pemilik: A
// Sukses: { belum_dibaca: number }
// Versi ringan untuk badge di navigasi: tidak mengambil isi notifikasi.
export async function GET() {
  const sesi = await sesiWajib();
  if (!sesi.ok) return sesi.respons;
  const { supabase, userId } = sesi.data;

  const { count, error } = await supabase
    .from("notifikasi")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("dibaca", false);
  if (error) return dariGalatDb(error, "GET /api/notifikasi/jumlah");

  return Response.json({ belum_dibaca: count ?? 0 }, { headers: { "cache-control": "no-store" } });
}
