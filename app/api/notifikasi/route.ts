import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { bacaBody, bilanganQuery, dariGalatDb, sesiWajib } from "@/lib/api";
import { batalkanKedaluwarsa } from "@/lib/pesanan-db";
import { SkemaTandaiNotifikasi } from "@/lib/skema-api";
import type { Notifikasi } from "@/types";

// Pemilik: A. Kontrak: docs/Pembagian Tugas dan Timeline.md bagian 4.

const KOLOM = "id, user_id, tipe, pesan, order_id, listing_id, dibaca, dibuat_pada";

function jumlahBelumDibaca(supabase: SupabaseClient, userId: string) {
  return supabase
    .from("notifikasi")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("dibaca", false);
}

// GET /api/notifikasi?belum_dibaca=1&batas=50
// Sukses: Notifikasi[] milik pengguna, terbaru dulu.
//         Header X-Belum-Dibaca berisi jumlah yang belum dibaca (untuk badge).
export async function GET(request: NextRequest) {
  const sesi = await sesiWajib();
  if (!sesi.ok) return sesi.respons;
  const { supabase, userId } = sesi.data;

  const params = request.nextUrl.searchParams;
  const hanyaBelumDibaca = ["1", "true"].includes(params.get("belum_dibaca") ?? "");
  const batas = bilanganQuery(params.get("batas"), 50, 1, 100);

  // Pembatalan otomatis 48 jam ikut membuat notifikasi, jadi dijalankan dulu.
  await batalkanKedaluwarsa(supabase);

  let query = supabase
    .from("notifikasi")
    .select(KOLOM)
    .eq("user_id", userId)
    .order("dibuat_pada", { ascending: false })
    .order("urutan", { ascending: false })
    .limit(batas);
  if (hanyaBelumDibaca) query = query.eq("dibaca", false);

  const [daftar, hitung] = await Promise.all([query, jumlahBelumDibaca(supabase, userId)]);
  if (daftar.error) return dariGalatDb(daftar.error, "GET /api/notifikasi");
  if (hitung.error) return dariGalatDb(hitung.error, "GET /api/notifikasi");

  return Response.json((daftar.data ?? []) as Notifikasi[], {
    headers: {
      "x-belum-dibaca": String(hitung.count ?? 0),
      "cache-control": "no-store",
    },
  });
}

// PATCH /api/notifikasi
// Body:   { ids?: string[] }   tanpa ids = tandai semua sudah dibaca
// Sukses: { diperbarui: number, belum_dibaca: number }
export async function PATCH(request: Request) {
  const sesi = await sesiWajib();
  if (!sesi.ok) return sesi.respons;
  const { supabase, userId } = sesi.data;

  const body = await bacaBody(request, SkemaTandaiNotifikasi);
  if (!body.ok) return body.respons;

  let query = supabase
    .from("notifikasi")
    .update({ dibaca: true })
    .eq("user_id", userId)
    .eq("dibaca", false);
  if (body.data.ids) query = query.in("id", body.data.ids);

  const ubah = await query.select("id");
  if (ubah.error) return dariGalatDb(ubah.error, "PATCH /api/notifikasi");

  const hitung = await jumlahBelumDibaca(supabase, userId);
  if (hitung.error) return dariGalatDb(hitung.error, "PATCH /api/notifikasi");

  return Response.json({
    diperbarui: ubah.data?.length ?? 0,
    belum_dibaca: hitung.count ?? 0,
  });
}
