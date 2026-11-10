// Query pesanan yang dipakai beberapa route handler.
// Semua query memakai client milik pengguna, jadi RLS tetap berlaku: pengguna
// hanya menerima pesanan yang ia beli atau pesanan di listing miliknya.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrderStatus, PesananLengkap } from "@/types";
import { KOLOM_PESANAN_LENGKAP, susunPesananLengkap, type BarisKontak } from "./pesanan";

interface GalatDb {
  code?: string | null;
  message?: string | null;
}

export type HasilDb<T> = { data: T; error: null } | { data: null; error: GalatDb };

/**
 * Batalkan pesanan yang menunggu konfirmasi lebih dari 48 jam (stok kembali,
 * kedua pihak diberi tahu). Dipanggil sebelum membaca atau mengubah pesanan.
 * Kegagalan di sini tidak boleh menggagalkan permintaan utama.
 */
export async function batalkanKedaluwarsa(supabase: SupabaseClient): Promise<void> {
  try {
    const { error } = await supabase.rpc("batalkan_pesanan_kedaluwarsa");
    if (error) console.error(`[pesanan kedaluwarsa] ${error.code}: ${error.message}`);
  } catch (e) {
    console.error("[pesanan kedaluwarsa]", e);
  }
}

async function petaKontak(
  supabase: SupabaseClient,
  orderId?: string,
): Promise<HasilDb<Map<string, BarisKontak>>> {
  const { data, error } = await supabase.rpc(
    "kontak_pesanan",
    orderId ? { p_order_id: orderId } : {},
  );
  if (error) return { data: null, error };
  const peta = new Map<string, BarisKontak>();
  for (const baris of (data ?? []) as BarisKontak[]) peta.set(baris.order_id, baris);
  return { data: peta, error: null };
}

export interface FilterPesanan {
  status?: OrderStatus[];
  listingId?: string;
  batas: number;
}

/** Pesanan milik pengguna (sebagai pembeli atau penjual), terbaru dulu. */
export async function daftarPesanan(
  supabase: SupabaseClient,
  idPengguna: string,
  filter: FilterPesanan,
): Promise<HasilDb<PesananLengkap[]>> {
  let query = supabase
    .from("orders")
    .select(KOLOM_PESANAN_LENGKAP)
    .order("dibuat_pada", { ascending: false })
    .order("id", { ascending: true })
    .limit(filter.batas);
  if (filter.status?.length) query = query.in("status", filter.status);
  if (filter.listingId) query = query.eq("listing_id", filter.listingId);

  const [pesanan, kontak] = await Promise.all([query, petaKontak(supabase)]);
  if (pesanan.error) return { data: null, error: pesanan.error };
  if (kontak.error) return { data: null, error: kontak.error };

  const baris = (pesanan.data ?? []) as unknown as Record<string, unknown>[];
  return {
    data: baris.flatMap((b) => susunPesananLengkap(b, idPengguna, kontak.data) ?? []),
    error: null,
  };
}

/** Satu pesanan, atau data null jika tidak ada / bukan milik pengguna. */
export async function satuPesanan(
  supabase: SupabaseClient,
  idPengguna: string,
  orderId: string,
): Promise<HasilDb<PesananLengkap | null>> {
  const [pesanan, kontak] = await Promise.all([
    supabase.from("orders").select(KOLOM_PESANAN_LENGKAP).eq("id", orderId).maybeSingle(),
    petaKontak(supabase, orderId),
  ]);
  if (pesanan.error) return { data: null, error: pesanan.error };
  if (kontak.error) return { data: null, error: kontak.error };
  if (!pesanan.data) return { data: null, error: null };

  return {
    data: susunPesananLengkap(
      pesanan.data as unknown as Record<string, unknown>,
      idPengguna,
      kontak.data,
    ),
    error: null,
  };
}
