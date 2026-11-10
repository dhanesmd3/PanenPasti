import { bacaBody, dariGalatDb, galat, idValid, sesiWajib } from "@/lib/api";
import { keListing } from "@/lib/pesanan";
import { SkemaSurplus } from "@/lib/skema-api";

// Pemilik: A. Kontrak: docs/Pembagian Tugas dan Timeline.md bagian 4.

type Konteks = { params: Promise<{ id: string }> };

// POST /api/listings/[id]/surplus
// Body:   { harga_surplus }   rupiah per kg, harus di bawah harga normal
// Sukses: Listing dengan is_surplus = true. Pembeli di sekitar penjual (kab/kota
//         yang sama atau berjarak sampai 100 km) mendapat notifikasi "surplus".
// Gagal:  401 · 404 bukan listing milik sendiri · 409 stok habis ·
//         422 harga tidak sah atau kecamatan penjual belum diisi · 400 body tidak valid
export async function POST(request: Request, { params }: Konteks) {
  const sesi = await sesiWajib();
  if (!sesi.ok) return sesi.respons;

  const { id } = await params;
  if (!idValid(id)) return galat("Panen tidak ditemukan.", 404);

  const body = await bacaBody(request, SkemaSurplus);
  if (!body.ok) return body.respons;

  const { data, error } = await sesi.data.supabase.rpc("tandai_surplus", {
    p_listing_id: id,
    p_harga_surplus: body.data.harga_surplus,
  });
  if (error) return dariGalatDb(error, "POST /api/listings/[id]/surplus");

  return Response.json(keListing(data));
}

// DELETE /api/listings/[id]/surplus
// Melepas tanda surplus: harga kembali ke harga normal dan notifikasi surplus
// yang belum dibaca ditarik.
// Sukses: Listing dengan is_surplus = false.
export async function DELETE(_request: Request, { params }: Konteks) {
  const sesi = await sesiWajib();
  if (!sesi.ok) return sesi.respons;

  const { id } = await params;
  if (!idValid(id)) return galat("Panen tidak ditemukan.", 404);

  const { data, error } = await sesi.data.supabase.rpc("batal_surplus", { p_listing_id: id });
  if (error) return dariGalatDb(error, "DELETE /api/listings/[id]/surplus");

  return Response.json(keListing(data));
}
