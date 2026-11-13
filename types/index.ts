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
  kab_kota: "Kab. Garut" | "Kota Bandung";
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
  /** Listing terkait. Selalu terisi untuk notifikasi surplus. */
  listing_id?: string | null;
  dibaca: boolean;
  dibuat_pada: string;
}

export type TingkatHarga = "produsen" | "pedagang_besar" | "pasar_tradisional";

export interface HargaHistoris {
  komoditas_id: number;
  tanggal: string;
  /** Contoh: "Kab. Garut", "Kota Bandung" */
  wilayah: string;
  tingkat: TingkatHarga;
  harga: number;
  sumber: string;
}

/**
 * Hasil GET /api/harga/acuan: harga pasar terbaru sebagai pembanding harga
 * di katalog. Rata-rata minggu terakhir yang ada datanya, Rupiah per kg.
 */
export interface HargaAcuan {
  komoditas_id: number;
  wilayah: string;
  /** Harga eceran pasar tradisional (harga yang biasa dibayar warung). */
  pasar_per_kg: number;
  /** Harga pedagang besar / grosir. */
  grosir_per_kg: number;
  /** Senin minggu yang dirata-rata, "YYYY-MM-DD". */
  minggu: string;
  /** Tanggal data terakhir, "YYYY-MM-DD". */
  data_sampai: string;
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

/** Satu minggu riwayat harga (rata-rata mingguan, Rp/kg). */
export interface HargaMingguan {
  /** Senin awal minggu */
  tanggal: string;
  grosir_bandung: number | null;
  pasar_bandung: number | null;
  petani_garut: number | null;
}

/** Hasil GET /api/harga/prediksi. */
export interface Prediksi {
  komoditas_id: number;
  sumber_data: string;
  /** Tanggal data harga terakhir yang tersedia. */
  data_sampai: string;
  /** true jika memakai data dummy berlabel "Data simulasi". */
  simulasi: boolean;
  /** Rata-rata minggu terakhir yang tersedia. */
  harga_terakhir: {
    grosir_bandung: number;
    pasar_bandung: number;
    /** Perkiraan = grosir × rasio_petani */
    petani_perkiraan: number;
  };
  /** Rata-rata 90 hari: harga produsen Garut ÷ grosir Bandung. */
  rasio_petani: number;
  /** 26 minggu terakhir, terlama dulu. */
  historis: HargaMingguan[];
  prediksi_grosir: TitikPrediksi[];
  /** Perkiraan harga di tingkat petani (prediksi grosir × rasio). Tampilkan ini ke penjual. */
  prediksi_petani: TitikPrediksi[];
  /** Senin minggu panen yang dipakai untuk saran. */
  minggu_panen: string;
  saran: SaranJual;
  /** Perubahan perkiraan harga petani di minggu panen vs sekarang, mis. 0.05 = +5%. */
  perubahan: number;
}

export type HariBerulang =
  | "mingguan:senin"
  | "mingguan:selasa"
  | "mingguan:rabu"
  | "mingguan:kamis"
  | "mingguan:jumat"
  | "mingguan:sabtu"
  | "mingguan:minggu";

/**
 * Hasil POST /api/ai/kebutuhan (AI-1).
 * Field null = tidak disebut di kalimat pengguna; form meminta pengguna mengisinya.
 */
export interface KebutuhanAI {
  komoditas_id: number;
  komoditas: string;
  jumlah_kg: number | null;
  tgl_butuh: string | null;
  berulang: HariBerulang | null;
}

/** Hasil POST /api/ai/listing (AI-2). Field null = tidak disebut. */
export interface ListingAI {
  komoditas_id: number;
  komoditas: string;
  jumlah_kg: number | null;
  tgl_panen: string | null;
  kualitas: string | null;
  harga_per_kg: number | null;
}

/** Bentuk respons gagal untuk semua endpoint AI. */
export interface GagalAI {
  ok: false;
  pesan: string;
  /** true = tampilkan form manual (fitur tetap bisa dipakai tanpa AI). */
  pakai_form_manual: boolean;
}

// ---------------------------------------------------------------------------
// Tambahan backend (A). Hanya penambahan: tipe di atas tidak berubah bentuk.
// ---------------------------------------------------------------------------

/** Bagian profil yang boleh dilihat pengguna lain (tanpa no_hp). */
export type ProfilPublik = Pick<Profile, "id" | "nama" | "nama_usaha" | "kecamatan_id">;

/** Kontak pihak lawan. Hanya ada selama pesanan Dikonfirmasi, Dikirim, atau Selesai. */
export interface KontakPesanan {
  nama: string;
  nama_usaha: string | null;
  no_hp: string | null;
  /** "https://wa.me/62...". Null jika pihak lawan belum mengisi nomor HP. */
  wa_url: string | null;
}

/** Hasil GET /api/orders dan GET /api/orders/[id]. */
export interface PesananLengkap extends Order {
  /** jumlah_kg × harga_per_kg, dibulatkan ke rupiah. */
  total_harga: number;
  listing: Listing;
  penjual: ProfilPublik;
  pembeli: ProfilPublik;
  /** Null selama kontak belum terbuka. */
  kontak: KontakPesanan | null;
  /** Posisi pengguna yang sedang login di pesanan ini. */
  peran_saya: Peran;
  /** Status berikutnya yang boleh dipilih pengguna ini. Kosong = tidak ada tombol aksi. */
  aksi: OrderStatus[];
}

/** Bentuk respons gagal untuk endpoint milik A (orders, notifikasi, surplus, auth, profil). */
export interface GalatApi {
  /** Kalimat berbahasa Indonesia yang boleh langsung ditampilkan ke pengguna. */
  error: string;
  /** Kode galat dari database, mis. "PP409". Tidak selalu ada. */
  kode?: string;
}
