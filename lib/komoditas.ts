// Daftar komoditas yang dikenal aplikasi. Sumber yang sama dipakai oleh:
//   - migrasi supabase/migrations/20261112100000_komoditas_tambahan.sql (isi tabel)
//   - data/seed/simulasi.json (listing simulasi)
//   - AI-1 dan AI-2 (mengenali nama komoditas dari kalimat pengguna)
//
// Prediksi harga dan AI-3 hanya untuk cabai rawit merah (id 1), karena hanya
// komoditas itu yang punya data harga PIHPS di data/harga. Komoditas lain bisa
// dijual, dicari, dan dipesan seperti biasa, tanpa saran harga.

export interface InfoKomoditas {
  id: number;
  /** Kode untuk keluaran AI (enum JSON schema). */
  kode: string;
  nama: string;
  /** Sebutan sehari-hari yang dipetakan AI ke komoditas ini. */
  sebutan: string;
  /** Rentang harga per kg yang masuk akal; di luar itu harga dari AI dibuang. */
  harga: readonly [number, number];
}

export const KOMODITAS_HARGA = 1; // Cabai Rawit Merah: satu-satunya yang punya prediksi harga

export const DAFTAR_KOMODITAS = [
  {
    id: 1,
    kode: "cabai_rawit_merah",
    nama: "Cabai Rawit Merah",
    sebutan: 'cabai rawit, cabe rawit, rawit, cengek, lombok rawit, atau "cabai"/"cabe" tanpa keterangan jenis',
    harga: [5_000, 300_000],
  },
  {
    id: 2,
    kode: "cabai_merah_keriting",
    nama: "Cabai Merah Keriting",
    sebutan: "cabai merah keriting, cabai keriting, cabe keriting, lombok keriting",
    harga: [5_000, 250_000],
  },
  { id: 3, kode: "tomat", nama: "Tomat", sebutan: "tomat, tomat sayur", harga: [1_000, 60_000] },
  { id: 4, kode: "kentang", nama: "Kentang", sebutan: "kentang, kentang granola", harga: [2_000, 80_000] },
  { id: 5, kode: "kubis", nama: "Kubis", sebutan: "kubis, kol, engkol", harga: [1_000, 40_000] },
  { id: 6, kode: "wortel", nama: "Wortel", sebutan: "wortel, bortel", harga: [1_000, 60_000] },
  {
    id: 7,
    kode: "bawang_merah",
    nama: "Bawang Merah",
    sebutan: "bawang merah, bawang beureum, brambang",
    harga: [5_000, 200_000],
  },
] as const satisfies readonly InfoKomoditas[];

export type KodeKomoditas = (typeof DAFTAR_KOMODITAS)[number]["kode"];

export const KODE_KOMODITAS = DAFTAR_KOMODITAS.map((k) => k.kode) as [KodeKomoditas, ...KodeKomoditas[]];

export function komoditasDariKode(kode: string): InfoKomoditas | undefined {
  return DAFTAR_KOMODITAS.find((k) => k.kode === kode);
}

export function komoditasDariId(id: number): InfoKomoditas | undefined {
  return DAFTAR_KOMODITAS.find((k) => k.id === id);
}

/**
 * Foto pengganti saat penjual tidak mengunggah foto: public/komoditas/<kode>.webp.
 * Semua dari Pexels (lisensi Pexels: bebas dipakai, atribusi tidak wajib tetapi
 * dicantumkan di sini dan di README). Dipotong persegi 560px, WebP.
 */
export const FOTO_KOMODITAS: Record<KodeKomoditas, { fotografer: string; sumber: string }> = {
  cabai_rawit_merah: { fotografer: "Terrance Barksdale", sumber: "https://www.pexels.com/photo/21273622/" },
  cabai_merah_keriting: { fotografer: "Mark Stebnicki", sumber: "https://www.pexels.com/photo/2893882/" },
  tomat: { fotografer: "Engin Akyurt", sumber: "https://www.pexels.com/photo/10112127/" },
  kentang: { fotografer: "Michael Burrows", sumber: "https://www.pexels.com/photo/7129145/" },
  kubis: { fotografer: "freestocks.org", sumber: "https://www.pexels.com/photo/134877/" },
  wortel: { fotografer: "Javier Balseiro", sumber: "https://www.pexels.com/photo/20371247/" },
  bawang_merah: { fotografer: "Miguel Á. Padriñán", sumber: "https://www.pexels.com/photo/144206/" },
};

/** Path foto komoditas dari nama yang tampil di UI (mis. "Tomat"), atau null. */
export function fotoKomoditas(nama: string): string | null {
  const k = DAFTAR_KOMODITAS.find((x) => x.nama.toLowerCase() === nama.trim().toLowerCase());
  return k ? `/komoditas/${k.kode}.webp` : null;
}
