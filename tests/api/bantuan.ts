// Supabase tiruan untuk menguji route handler tanpa jaringan.
// Yang diuji di tests/api adalah alur route: sesi, validasi body, argumen yang
// dikirim ke database, dan pemetaan galat ke status HTTP. SQL-nya sendiri diuji
// di supabase/tests.

import { vi } from "vitest";

export interface HasilTiruan {
  data?: unknown;
  error?: { code?: string; message?: string } | null;
  count?: number | null;
}

type Panggilan = [metode: string, argumen: unknown[]];

export interface KueriTiruan {
  tabel: string;
  panggilan: Panggilan[];
  /** Argumen panggilan pertama untuk metode tertentu, mis. argumen("update"). */
  argumen(metode: string): unknown[] | undefined;
  punya(metode: string): boolean;
}

const METODE = [
  "select",
  "insert",
  "update",
  "delete",
  "eq",
  "in",
  "order",
  "limit",
  "single",
  "maybeSingle",
] as const;

export function buatSupabaseTiruan() {
  const kueri: KueriTiruan[] = [];
  const antreanTabel = new Map<string, HasilTiruan[]>();
  const hasilRpc = new Map<string, HasilTiruan>();

  const rpc = vi.fn(async (nama: string, _argumen?: unknown): Promise<HasilTiruan> => {
    void _argumen;
    return hasilRpc.get(nama) ?? { data: null, error: null };
  });

  const from = vi.fn((tabel: string) => {
    const panggilan: Panggilan[] = [];
    const catatan: KueriTiruan = {
      tabel,
      panggilan,
      argumen: (metode) => panggilan.find(([m]) => m === metode)?.[1],
      punya: (metode) => panggilan.some(([m]) => m === metode),
    };
    kueri.push(catatan);

    const pembangun: Record<string, unknown> = {};
    for (const metode of METODE) {
      pembangun[metode] = (...argumen: unknown[]) => {
        panggilan.push([metode, argumen]);
        return pembangun;
      };
    }
    // Query builder Supabase bisa di-await; hasilnya diambil dari antrean tabel.
    pembangun.then = (lanjut: (h: HasilTiruan) => unknown, tolak?: (e: unknown) => unknown) => {
      const antre = antreanTabel.get(tabel) ?? [];
      const hasil = antre.shift() ?? { data: [], error: null, count: 0 };
      return Promise.resolve(hasil).then(lanjut, tolak);
    };
    return pembangun;
  });

  const auth = {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(async () => ({ error: null })),
  };

  return {
    klien: { rpc, from, auth },
    rpc,
    from,
    auth,
    kueri,
    /** Hasil untuk query berikutnya ke `tabel` (bisa dipanggil beberapa kali, berurutan). */
    jawabTabel(tabel: string, hasil: HasilTiruan) {
      antreanTabel.set(tabel, [...(antreanTabel.get(tabel) ?? []), hasil]);
    },
    jawabRpc(nama: string, hasil: HasilTiruan) {
      hasilRpc.set(nama, hasil);
    },
    kueriKe(tabel: string): KueriTiruan[] {
      return kueri.filter((k) => k.tabel === tabel);
    },
  };
}

export type SupabaseTiruan = ReturnType<typeof buatSupabaseTiruan>;

export const ID = {
  order: "11111111-1111-4111-8111-111111111111",
  listing: "22222222-2222-4222-8222-222222222222",
  penjual: "33333333-3333-4333-8333-333333333333",
  pembeli: "44444444-4444-4444-8444-444444444444",
  notif: "66666666-6666-4666-8666-666666666666",
} as const;

export function permintaan(metode: string, url: string, body?: unknown, headers?: Record<string, string>) {
  return new Request(`http://localhost${url}`, {
    method: metode,
    headers: { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
}

export const konteks = (id: string) => ({ params: Promise.resolve({ id }) });

export const barisOrder = (status = "menunggu") => ({
  id: ID.order,
  listing_id: ID.listing,
  pembeli_id: ID.pembeli,
  kebutuhan_id: null,
  jumlah_kg: 20,
  harga_per_kg: 62000,
  status,
  alasan_batal: null,
  dibuat_pada: "2026-11-10T03:00:00+00:00",
  diubah_pada: "2026-11-10T03:00:00+00:00",
});

export const barisListing = (ubah: Record<string, unknown> = {}) => ({
  id: ID.listing,
  penjual_id: ID.penjual,
  komoditas_id: 1,
  jumlah_kg: 500,
  sisa_kg: 480,
  kualitas: "Super",
  tgl_panen: "2026-12-01",
  harga_per_kg: 62000,
  foto_url: null,
  status: "estimasi",
  is_surplus: false,
  harga_surplus: null,
  ...ubah,
});

export const barisPesananLengkap = (status = "menunggu") => ({
  ...barisOrder(status),
  listing: {
    ...barisListing(),
    penjual: { id: ID.penjual, nama: "Asep", nama_usaha: "Tani Pasir Hejo", kecamatan_id: 3205120 },
  },
  pembeli: { id: ID.pembeli, nama: "Siti", nama_usaha: null, kecamatan_id: 3273240 },
});
