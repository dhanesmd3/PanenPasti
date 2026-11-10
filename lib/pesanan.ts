// Aturan status pesanan (docs/PRD bagian 10) dalam bentuk TypeScript.
//
// Sumber kebenaran tetap fungsi database ubah_status (supabase/migrations).
// Tabel di sini dipakai route handler untuk menyusun daftar tombol aksi, dan
// supabase/tests/pesanan.test.ts memastikan keduanya selalu sama.

import type {
  KontakPesanan,
  Listing,
  Order,
  OrderStatus,
  Peran,
  PesananLengkap,
  ProfilPublik,
} from "@/types";

export const STATUS_PESANAN = [
  "menunggu",
  "dikonfirmasi",
  "dikirim",
  "selesai",
  "ditolak",
  "dibatalkan",
  "gagal_panen",
] as const satisfies readonly OrderStatus[];

/** TRANSISI[dari][ke] = peran yang boleh melakukan perpindahan itu. */
export const TRANSISI: Record<OrderStatus, Partial<Record<OrderStatus, Peran>>> = {
  menunggu: { dikonfirmasi: "penjual", ditolak: "penjual", dibatalkan: "pembeli" },
  dikonfirmasi: { dikirim: "penjual", gagal_panen: "penjual" },
  dikirim: { selesai: "pembeli" },
  selesai: {},
  ditolak: {},
  dibatalkan: {},
  gagal_panen: {},
};

/** Status yang mengembalikan stok ke listing. */
export const STATUS_MENGEMBALIKAN_STOK: readonly OrderStatus[] = [
  "ditolak",
  "dibatalkan",
  "gagal_panen",
];

/** Status yang membuka kontak (nomor HP) kedua pihak. */
export const STATUS_KONTAK_TERBUKA: readonly OrderStatus[] = ["dikonfirmasi", "dikirim", "selesai"];

export const LABEL_STATUS: Record<OrderStatus, string> = {
  menunggu: "Menunggu konfirmasi",
  dikonfirmasi: "Dikonfirmasi",
  dikirim: "Dikirim",
  selesai: "Selesai",
  ditolak: "Ditolak",
  dibatalkan: "Dibatalkan",
  gagal_panen: "Dibatalkan (gagal panen)",
};

/** Pesanan Menunggu konfirmasi lebih lama dari ini batal otomatis. */
export const BATAS_KONFIRMASI_JAM = 48;

export function adalahStatusPesanan(nilai: unknown): nilai is OrderStatus {
  return typeof nilai === "string" && (STATUS_PESANAN as readonly string[]).includes(nilai);
}

/** Status berikutnya yang boleh dipilih `peran` untuk pesanan berstatus `status`. */
export function aksiTersedia(status: OrderStatus, peran: Peran): OrderStatus[] {
  return (Object.entries(TRANSISI[status]) as [OrderStatus, Peran][])
    .filter(([, pelaku]) => pelaku === peran)
    .map(([ke]) => ke);
}

export function bolehPindah(dari: OrderStatus, ke: OrderStatus, peran: Peran): boolean {
  return TRANSISI[dari][ke] === peran;
}

export function kontakTerbuka(status: OrderStatus): boolean {
  return STATUS_KONTAK_TERBUKA.includes(status);
}

/**
 * Ubah nomor HP menjadi format wa.me: "0812-0000-0101" → "6281200000101".
 * Aturannya sama dengan fungsi database normalisasi_no_hp. Mengembalikan null
 * jika hasilnya bukan nomor Indonesia yang valid.
 */
export function normalisasiNoHp(masukan: string | null | undefined): string | null {
  if (masukan == null) return null;
  let angka = masukan.replace(/\D/g, "");
  if (angka.startsWith("62")) {
    // sudah format internasional
  } else if (angka.startsWith("0")) {
    angka = `62${angka.slice(1)}`;
  } else if (angka.startsWith("8")) {
    angka = `62${angka}`;
  }
  return /^62\d{8,13}$/.test(angka) ? angka : null;
}

/** "6281200000101" → "https://wa.me/6281200000101". */
export function tautanWa(noHp: string | null | undefined): string | null {
  const nomor = normalisasiNoHp(noHp);
  return nomor ? `https://wa.me/${nomor}` : null;
}

// ---------------------------------------------------------------------------
// Baris database → tipe bersama
// ---------------------------------------------------------------------------
// Kolom numeric Postgres bisa datang sebagai string, jadi angka selalu dipaksa
// menjadi number sebelum dikirim ke klien.

type Baris = Record<string, unknown>;

const angka = (v: unknown): number => Number(v);
const angkaAtauNull = (v: unknown): number | null => (v == null ? null : Number(v));
const teksAtauNull = (v: unknown): string | null => (v == null ? null : String(v));

export function keOrder(b: Baris): Order {
  return {
    id: String(b.id),
    listing_id: String(b.listing_id),
    pembeli_id: String(b.pembeli_id),
    kebutuhan_id: teksAtauNull(b.kebutuhan_id),
    jumlah_kg: angka(b.jumlah_kg),
    harga_per_kg: angka(b.harga_per_kg),
    status: b.status as OrderStatus,
    alasan_batal: teksAtauNull(b.alasan_batal),
    dibuat_pada: String(b.dibuat_pada),
    diubah_pada: String(b.diubah_pada),
  };
}

export function keListing(b: Baris): Listing {
  return {
    id: String(b.id),
    penjual_id: String(b.penjual_id),
    komoditas_id: angka(b.komoditas_id),
    jumlah_kg: angka(b.jumlah_kg),
    sisa_kg: angka(b.sisa_kg),
    kualitas: teksAtauNull(b.kualitas),
    tgl_panen: String(b.tgl_panen),
    harga_per_kg: angka(b.harga_per_kg),
    foto_url: teksAtauNull(b.foto_url),
    status: b.status as Listing["status"],
    is_surplus: Boolean(b.is_surplus),
    harga_surplus: angkaAtauNull(b.harga_surplus),
  };
}

export function keProfilPublik(b: Baris): ProfilPublik {
  return {
    id: String(b.id),
    nama: String(b.nama),
    nama_usaha: teksAtauNull(b.nama_usaha),
    // Di database kolom ini boleh kosong sesaat setelah akun dibuat lewat skrip
    // seed. Nilai kosong diteruskan sebagai null, tidak diubah menjadi 0.
    kecamatan_id: angkaAtauNull(b.kecamatan_id) as number,
  };
}

/** Baris hasil fungsi database kontak_pesanan(). */
export interface BarisKontak {
  order_id: string;
  user_id: string;
  peran: Peran;
  nama: string;
  nama_usaha: string | null;
  no_hp: string | null;
}

export function keKontak(b: BarisKontak): KontakPesanan {
  return {
    nama: b.nama,
    nama_usaha: b.nama_usaha,
    no_hp: b.no_hp,
    wa_url: tautanWa(b.no_hp),
  };
}

/** Kolom untuk select pesanan beserta listing dan kedua profil publiknya. */
export const KOLOM_PESANAN_LENGKAP =
  "id, listing_id, pembeli_id, kebutuhan_id, jumlah_kg, harga_per_kg, status, alasan_batal, dibuat_pada, diubah_pada, " +
  "listing:listings!inner(id, penjual_id, komoditas_id, jumlah_kg, sisa_kg, kualitas, tgl_panen, harga_per_kg, foto_url, status, is_surplus, harga_surplus, " +
  "penjual:profiles!penjual_id(id, nama, nama_usaha, kecamatan_id)), " +
  "pembeli:profiles!pembeli_id(id, nama, nama_usaha, kecamatan_id)";

/**
 * Susun satu pesanan untuk klien. Mengembalikan null jika baris tidak lengkap
 * atau pengguna bukan pihak di pesanan ini (tidak seharusnya lolos dari RLS).
 */
export function susunPesananLengkap(
  baris: Baris,
  idPengguna: string,
  kontak: Map<string, BarisKontak>,
): PesananLengkap | null {
  const listingMentah = baris.listing as (Baris & { penjual?: Baris | null }) | null | undefined;
  const pembeliMentah = baris.pembeli as Baris | null | undefined;
  if (!listingMentah || !listingMentah.penjual || !pembeliMentah) return null;

  const order = keOrder(baris);
  const listing = keListing(listingMentah);

  let peranSaya: Peran;
  if (order.pembeli_id === idPengguna) peranSaya = "pembeli";
  else if (listing.penjual_id === idPengguna) peranSaya = "penjual";
  else return null;

  const barisKontak = kontak.get(order.id);
  return {
    ...order,
    total_harga: Math.round(order.jumlah_kg * order.harga_per_kg),
    listing,
    penjual: keProfilPublik(listingMentah.penjual),
    pembeli: keProfilPublik(pembeliMentah),
    kontak: barisKontak && kontakTerbuka(order.status) ? keKontak(barisKontak) : null,
    peran_saya: peranSaya,
    aksi: aksiTersedia(order.status, peranSaya),
  };
}
