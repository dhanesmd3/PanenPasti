import { bacaBody, dariGalatDb, galat, idValid, sesiWajib } from "@/lib/api";
import { keOrder } from "@/lib/pesanan";
import { batalkanKedaluwarsa, satuPesanan } from "@/lib/pesanan-db";
import { SkemaUbahStatus } from "@/lib/skema-api";

// Pemilik: A. Kontrak: docs/Pembagian Tugas dan Timeline.md bagian 4.

type Konteks = { params: Promise<{ id: string }> };

// GET /api/orders/[id]
// Sukses: PesananLengkap. `kontak` terisi mulai status Dikonfirmasi.
// Gagal:  404 jika pesanan tidak ada atau bukan milik pengguna.
export async function GET(_request: Request, { params }: Konteks) {
  const sesi = await sesiWajib();
  if (!sesi.ok) return sesi.respons;
  const { supabase, userId } = sesi.data;

  const { id } = await params;
  if (!idValid(id)) return galat("Pesanan tidak ditemukan.", 404);

  await batalkanKedaluwarsa(supabase);

  const hasil = await satuPesanan(supabase, userId, id);
  if (hasil.error) return dariGalatDb(hasil.error, "GET /api/orders/[id]");
  if (!hasil.data) return galat("Pesanan tidak ditemukan.", 404);

  return Response.json(hasil.data, { headers: { "cache-control": "no-store" } });
}

// PATCH /api/orders/[id]
// Body:   { status, alasan? }
//
//   status         pelaku    dari status     catatan
//   dikonfirmasi   penjual   menunggu        kontak kedua pihak terbuka
//   ditolak        penjual   menunggu        stok kembali, alasan opsional
//   dibatalkan     pembeli   menunggu        stok kembali, alasan opsional
//   dikirim        penjual   dikonfirmasi
//   gagal_panen    penjual   dikonfirmasi    stok kembali, alasan WAJIB
//   selesai        pembeli   dikirim
//
// Sukses: Order dengan status baru. Pihak lawan mendapat notifikasi.
// Gagal:  401 · 403 bukan pelaku yang berhak · 404 · 409 perpindahan tidak sah ·
//         400 body tidak valid
export async function PATCH(request: Request, { params }: Konteks) {
  const sesi = await sesiWajib();
  if (!sesi.ok) return sesi.respons;
  const { supabase } = sesi.data;

  const { id } = await params;
  if (!idValid(id)) return galat("Pesanan tidak ditemukan.", 404);

  const body = await bacaBody(request, SkemaUbahStatus);
  if (!body.ok) return body.respons;

  // Pesanan yang sudah lewat 48 jam dibatalkan dulu, supaya tidak bisa
  // dikonfirmasi setelah stoknya seharusnya sudah kembali.
  await batalkanKedaluwarsa(supabase);

  const { data, error } = await supabase.rpc("ubah_status", {
    p_order_id: id,
    p_status_baru: body.data.status,
    p_alasan: body.data.alasan ?? null,
  });
  if (error) return dariGalatDb(error, "PATCH /api/orders/[id]");

  return Response.json(keOrder(data));
}
