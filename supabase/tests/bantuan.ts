// Perkakas test database.
//
// Migrasi asli di supabase/migrations dijalankan di Postgres sungguhan yang
// berjalan di dalam proses test (PGlite), di atas tiruan kecil skema Supabase
// (tiruan-supabase.sql). Tidak butuh Docker, jaringan, atau project Supabase.
//
// Yang diuji di sini adalah SQL-nya: trigger, fungsi, RLS, dan hak akses.
// PGlite hanya punya satu koneksi, jadi uji dua transaksi yang benar-benar
// bersamaan ada di supabase/tests/uji-supabase.mjs (`npm run uji:supabase`,
// butuh project Supabase).

import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";

const FOLDER_MIGRASI = path.join(process.cwd(), "supabase", "migrations");
const FILE_TIRUAN = path.join(process.cwd(), "supabase", "tests", "tiruan-supabase.sql");

export type Baris = Record<string, unknown>;
export type Jalankan = (sql: string, params?: unknown[]) => Promise<Baris[]>;

export interface GalatSql {
  code: string;
  message: string;
}

export const KECAMATAN = {
  /** Cikajang, Kab. Garut */
  cikajang: 3205120,
  /** Cisewu, Kab. Garut (paling barat) */
  cisewu: 3205010,
  /** Sukajadi, Kota Bandung */
  sukajadi: 3273240,
  /** Cidadap, Kota Bandung */
  cidadap: 3273260,
} as const;

export interface PenggunaBaru {
  peran: "penjual" | "pembeli";
  nama?: string;
  nama_usaha?: string | null;
  kecamatan_id?: number | null;
  no_hp?: string | null;
}

export interface ListingBaru {
  jumlah_kg?: number;
  harga_per_kg?: number;
  /** Selisih hari dari hari ini (WIB). */
  panen_dalam_hari?: number;
  status?: "estimasi" | "siap" | "habis";
  kualitas?: string | null;
}

export class DbUji {
  private constructor(private readonly pg: PGlite) {}

  static async buat(): Promise<DbUji> {
    const pg = new PGlite();
    await pg.exec(readFileSync(FILE_TIRUAN, "utf-8"));
    const berkas = readdirSync(FOLDER_MIGRASI)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    for (const nama of berkas) {
      try {
        await pg.exec(readFileSync(path.join(FOLDER_MIGRASI, nama), "utf-8"));
      } catch (e) {
        throw new Error(`Migrasi ${nama} gagal: ${(e as Error).message}`);
      }
    }
    return new DbUji(pg);
  }

  async tutup(): Promise<void> {
    await this.pg.close();
  }

  /** Jalankan sebagai pemilik database (melewati RLS), seperti migrasi. */
  admin: Jalankan = async (sql, params = []) => {
    const hasil = await this.pg.query<Baris>(sql, params);
    return hasil.rows;
  };

  private async denganRole<T>(
    role: "authenticated" | "anon" | "service_role" | "supabase_auth_admin",
    userId: string | null,
    aksi: (q: Jalankan) => Promise<T>,
  ): Promise<T> {
    const klaim = userId ? JSON.stringify({ sub: userId, role }) : "";
    await this.pg.query("select set_config('request.jwt.claims', $1, false)", [klaim]);
    await this.pg.exec(`set role ${role}`);
    try {
      return await aksi(async (sql, params = []) => {
        const hasil = await this.pg.query<Baris>(sql, params);
        return hasil.rows;
      });
    } finally {
      await this.pg.exec("reset role");
      await this.pg.query("select set_config('request.jwt.claims', '', false)");
    }
  }

  /** Seperti permintaan dari browser pengguna yang sudah login (role authenticated). */
  sebagai<T>(userId: string, aksi: (q: Jalankan) => Promise<T>): Promise<T> {
    return this.denganRole("authenticated", userId, aksi);
  }

  /** Seperti permintaan tanpa login (role anon). */
  sebagaiTamu<T>(aksi: (q: Jalankan) => Promise<T>): Promise<T> {
    return this.denganRole("anon", null, aksi);
  }

  /** Seperti skrip seed yang memakai service role key. */
  sebagaiService<T>(aksi: (q: Jalankan) => Promise<T>): Promise<T> {
    return this.denganRole("service_role", null, aksi);
  }

  /** Seperti Supabase Auth (GoTrue) yang menulis auth.users; tanpa hak di skema public. */
  sebagaiAuthAdmin<T>(aksi: (q: Jalankan) => Promise<T>): Promise<T> {
    return this.denganRole("supabase_auth_admin", null, aksi);
  }

  /** Buat akun lewat auth.users, sama seperti Supabase Auth; profil dibuat trigger. */
  async buatPengguna(p: PenggunaBaru): Promise<string> {
    const id = randomUUID();
    const meta: Baris = { peran: p.peran, nama: p.nama ?? `Uji ${p.peran}` };
    if (p.nama_usaha !== undefined) meta.nama_usaha = p.nama_usaha;
    const kecamatan =
      p.kecamatan_id === undefined
        ? p.peran === "penjual"
          ? KECAMATAN.cikajang
          : KECAMATAN.sukajadi
        : p.kecamatan_id;
    if (kecamatan !== null) meta.kecamatan_id = kecamatan;
    const noHp = p.no_hp === undefined ? "081200000000" : p.no_hp;
    if (noHp !== null) meta.no_hp = noHp;

    await this.admin(
      "insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3::jsonb)",
      [id, `${id}@uji.test`, JSON.stringify(meta)],
    );
    return id;
  }

  /** Buat listing langsung (seperti skrip seed), tanpa lewat RLS. */
  async buatListing(penjualId: string, l: ListingBaru = {}): Promise<string> {
    const [baris] = await this.admin(
      `insert into public.listings (penjual_id, komoditas_id, jumlah_kg, harga_per_kg, tgl_panen, status, kualitas)
       values ($1, 1, $2, $3, public.hari_ini_wib() + $4::int, $5, $6)
       returning id`,
      [
        penjualId,
        l.jumlah_kg ?? 100,
        l.harga_per_kg ?? 60000,
        l.panen_dalam_hari ?? 14,
        l.status ?? "estimasi",
        l.kualitas ?? null,
      ],
    );
    return String(baris.id);
  }

  async listing(id: string): Promise<Baris> {
    const [baris] = await this.admin("select * from public.listings where id = $1", [id]);
    return baris;
  }

  async order(id: string): Promise<Baris> {
    const [baris] = await this.admin("select * from public.orders where id = $1", [id]);
    return baris;
  }

  async notifikasi(userId: string): Promise<Baris[]> {
    return this.admin(
      "select * from public.notifikasi where user_id = $1 order by dibuat_pada, urutan",
      [userId],
    );
  }

  /** Pembeli memesan lewat fungsi buat_pesanan; mengembalikan id pesanan. */
  async pesan(pembeliId: string, listingId: string, jumlahKg: number): Promise<string> {
    const [baris] = await this.sebagai(pembeliId, (q) =>
      q("select * from public.buat_pesanan($1, $2)", [listingId, jumlahKg]),
    );
    return String(baris.id);
  }

  /** Ubah status lewat fungsi ubah_status sebagai `userId`. */
  async ubahStatus(
    userId: string,
    orderId: string,
    status: string,
    alasan: string | null = null,
  ): Promise<Baris> {
    const [baris] = await this.sebagai(userId, (q) =>
      q("select * from public.ubah_status($1, $2, $3)", [orderId, status, alasan]),
    );
    return baris;
  }
}

/** Jalankan aksi yang diharapkan gagal; kembalikan SQLSTATE dan pesannya. */
export async function galatDari(aksi: () => Promise<unknown>): Promise<GalatSql> {
  try {
    await aksi();
  } catch (e) {
    const g = e as { code?: string; message?: string };
    return { code: g.code ?? "", message: g.message ?? String(e) };
  }
  throw new Error("Diharapkan gagal, tetapi berhasil.");
}
