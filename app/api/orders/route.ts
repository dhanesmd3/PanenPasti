import type { NextRequest } from "next/server";
import { bacaBody, bilanganQuery, dariGalatDb, galat, idValid, sesiWajib } from "@/lib/api";
import { adalahStatusPesanan, keOrder } from "@/lib/pesanan";
import { batalkanKedaluwarsa, daftarPesanan } from "@/lib/pesanan-db";
import { SkemaBuatPesanan } from "@/lib/skema-api";

// Pemilik: A. Kontrak: docs/Pembagian Tugas dan Timeline.md bagian 4.

// GET /api/orders?status=menunggu,dikonfirmasi&listing_id=<uuid>&batas=50
// Pesanan milik pengguna: pembeli melihat pesanannya, penjual melihat pesanan
// di listing miliknya. Terbaru dulu.
// Sukses: PesananLengkap[] (pesanan + listing + kedua profil + kontak + aksi)
export async function GET(request: NextRequest) {
  const sesi = await sesiWajib();
  if (!sesi.ok) return sesi.respons;
  const { supabase, userId } = sesi.data;

  const params = request.nextUrl.searchParams;
  const status = (params.get("status") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!status.every(adalahStatusPesanan)) {
    return galat("Filter status tidak dikenal.", 400);
  }
  const listingId = params.get("listing_id") ?? undefined;
  if (listingId !== undefined && !idValid(listingId)) {
    return galat("Filter listing_id tidak valid.", 400);
  }

  await batalkanKedaluwarsa(supabase);

  const hasil = await daftarPesanan(supabase, userId, {
    status,
    listingId,
    batas: bilanganQuery(params.get("batas"), 50, 1, 100),
  });
  if (hasil.error) return dariGalatDb(hasil.error, "GET /api/orders");

  return Response.json(hasil.data, { headers: { "cache-control": "no-store" } });
}

// POST /api/orders
// Body:   { listing_id, jumlah_kg, kebutuhan_id? }
// Sukses: 201 Order (status "menunggu"). Stok listing langsung berkurang dan
//         penjual mendapat notifikasi, semuanya dalam satu transaksi database.
// Gagal:  401 belum login · 403 bukan pembeli · 404 listing tidak ada ·
//         409 stok habis/tidak cukup · 400 body tidak valid
export async function POST(request: Request) {
  const sesi = await sesiWajib();
  if (!sesi.ok) return sesi.respons;

  const body = await bacaBody(request, SkemaBuatPesanan);
  if (!body.ok) return body.respons;

  const { data, error } = await sesi.data.supabase.rpc("buat_pesanan", {
    p_listing_id: body.data.listing_id,
    p_jumlah_kg: body.data.jumlah_kg,
    p_kebutuhan_id: body.data.kebutuhan_id ?? null,
  });
  if (error) return dariGalatDb(error, "POST /api/orders");

  return Response.json(keOrder(data), { status: 201 });
}
