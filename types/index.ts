// Tipe bersama untuk seluruh aplikasi.
// Sumber kebenaran: docs/PRD PanenPasti v2.md bagian 10 (status) dan 11 (tabel).
// Ubah file ini hanya setelah disepakati A (backend) dan D (AI & data).

export type Peran = "penjual" | "pembeli";

export interface Profile {
  id: string;
  peran: Peran;
  nama: string;
  nama_usaha: string | null;
  kecamatan_id: number;
  /** Hanya terlihat oleh pihak lawan setelah pesanan Dikonfirmasi. */
  no_hp: string | null;
}

export interface Kecamatan {
  id: number;
  nama: string;
  lat: number;
  lng: number;
}

export interface Komoditas {
  id: number;
  nama: string;
  satuan: "kg";
}

export type StatusListing = "estimasi" | "siap" | "habis";

export interface Listing {
  id: string;
  penjual_id: string;
  komoditas_id: number;
  jumlah_kg: number;
  sisa_kg: number;
  kualitas: string | null;
  /** Tanggal ISO, contoh "2026-11-28". */
  tgl_panen: string;
  harga_per_kg: number;
  foto_url: string | null;
  status: StatusListing;
  is_surplus: boolean;
  harga_surplus: number | null;
}

export interface Kebutuhan {
  id: string;
  pembeli_id: string;
  komoditas_id: number;
  jumlah_kg: number;
  tgl_butuh: string;
  /** Contoh: "mingguan:senin". Null jika sekali pesan. */
  berulang: string | null;
  teks_asli: string | null;
  dibuat_ai: boolean;
}

export type OrderStatus =
  | "menunggu"
  | "dikonfirmasi"
  | "dikirim"
  | "selesai"
  | "ditolak"
  | "dibatalkan"
  | "gagal_panen";

export interface Order {
  id: string;
  listing_id: string;
  pembeli_id: string;
  kebutuhan_id: string | null;
  jumlah_kg: number;
  harga_per_kg: number;
  status: OrderStatus;
  alasan_batal: string | null;
  dibuat_pada: string;
  diubah_pada: string;
}

export type TipeNotifikasi =
  | "pesanan_baru"
  | "status_berubah"
  | "surplus"
  | "pengganti_tersedia";

export interface Notifikasi {
  id: string;
  user_id: string;
  tipe: TipeNotifikasi;
  pesan: string;
  order_id: string | null;
  dibaca: boolean;
  dibuat_pada: string;
}

export interface HargaHistoris {
  komoditas_id: number;
  tanggal: string;
  harga: number;
  sumber: string;
}

/** Hasil POST /api/match. */
export interface HasilMatching {
  listing: Listing;
  penjual: Pick<Profile, "id" | "nama" | "nama_usaha" | "kecamatan_id">;
  /** 0–100 */
  skor: number;
  jarak_km: number;
  selisih_hari: number;
  /** Kalimat singkat, contoh "panen 1 hari sebelum tanggal butuh · stok cukup · 12 km". */
  alasan: string;
}

export interface TitikPrediksi {
  tanggal: string;
  nilai: number;
  bawah: number;
  atas: number;
}

export type SaranJual = "tahan" | "jual";

/** Hasil GET /api/harga/prediksi. */
export interface Prediksi {
  komoditas_id: number;
  historis: Pick<HargaHistoris, "tanggal" | "harga">[];
  prediksi: TitikPrediksi[];
  saran: SaranJual;
  sumber_data: string;
  /** true jika memakai data dummy berlabel "Data simulasi". */
  simulasi: boolean;
}

/** Hasil POST /api/ai/kebutuhan (AI-1). */
export interface KebutuhanAI {
  komoditas: string;
  jumlah_kg: number;
  tgl_butuh: string;
  berulang: string | null;
}

/** Hasil POST /api/ai/listing (AI-2). */
export interface ListingAI {
  komoditas: string;
  jumlah_kg: number;
  tgl_panen: string;
  kualitas: string | null;
  harga_per_kg: number | null;
}
