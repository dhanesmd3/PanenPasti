// Penjaga keamanan untuk seluruh skema public. Test ini sengaja memeriksa
// katalog Postgres, bukan daftar tabel yang ditulis tangan, supaya tabel atau
// fungsi baru yang lupa diamankan langsung membuat test gagal.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DbUji, galatDari } from "./bantuan";

let db: DbUji;

beforeAll(async () => {
  db = await DbUji.buat();
}, 120_000);

afterAll(async () => {
  await db.tutup();
});

describe("skema public", () => {
  it("berisi tabel yang diharapkan dan semuanya memakai Row Level Security", async () => {
    const tabel = await db.admin(
      `select c.relname as nama, c.relrowsecurity as rls
       from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r'
       order by c.relname`,
    );
    expect(tabel.map((t) => t.nama)).toEqual([
      "harga_historis",
      "kebutuhan",
      "kecamatan",
      "komoditas",
      "listings",
      "notifikasi",
      "orders",
      "profiles",
    ]);
    expect(tabel.filter((t) => !t.rls)).toEqual([]);
  });

  it("tamu (anon) hanya bisa membaca data referensi publik", async () => {
    const hak = await db.admin(
      `select table_name, privilege_type
       from information_schema.role_table_grants
       where table_schema = 'public' and grantee = 'anon'
       order by table_name, privilege_type`,
    );
    expect(hak).toEqual([
      { table_name: "harga_historis", privilege_type: "SELECT" },
      { table_name: "kecamatan", privilege_type: "SELECT" },
      { table_name: "komoditas", privilege_type: "SELECT" },
    ]);

    const hakKolom = await db.admin(
      `select 1 from information_schema.column_privileges
       where table_schema = 'public' and grantee = 'anon'
         and table_name not in ('harga_historis', 'kecamatan', 'komoditas')`,
    );
    expect(hakKolom).toEqual([]);
  });

  it("pengguna login hanya punya hak tulis yang memang dibutuhkan", async () => {
    const hak = await db.admin(
      `select table_name, string_agg(privilege_type, ',' order by privilege_type) as hak
       from information_schema.role_table_grants
       where table_schema = 'public' and grantee = 'authenticated'
       group by table_name order by table_name`,
    );
    expect(hak).toEqual([
      { table_name: "harga_historis", hak: "SELECT" },
      { table_name: "kebutuhan", hak: "DELETE,INSERT,SELECT,UPDATE" },
      { table_name: "kecamatan", hak: "SELECT" },
      { table_name: "komoditas", hak: "SELECT" },
      { table_name: "listings", hak: "DELETE,INSERT,SELECT,UPDATE" },
      { table_name: "notifikasi", hak: "SELECT" },
      { table_name: "orders", hak: "SELECT" },
      // profiles: tidak ada hak tingkat tabel, hanya hak per kolom (di bawah).
    ]);

    const kolom = await db.admin(
      `select table_name, privilege_type, string_agg(column_name, ',' order by column_name) as kolom
       from information_schema.column_privileges
       where table_schema = 'public' and grantee = 'authenticated'
         and table_name in ('profiles', 'notifikasi') and privilege_type <> 'SELECT'
       group by table_name, privilege_type order by table_name, privilege_type`,
    );
    expect(kolom).toEqual([
      { table_name: "notifikasi", privilege_type: "UPDATE", kolom: "dibaca" },
      { table_name: "profiles", privilege_type: "UPDATE", kolom: "kecamatan_id,nama,nama_usaha,no_hp" },
    ]);

    const bacaProfil = await db.admin(
      `select string_agg(column_name, ',' order by column_name) as kolom
       from information_schema.column_privileges
       where table_schema = 'public' and grantee = 'authenticated'
         and table_name = 'profiles' and privilege_type = 'SELECT'`,
    );
    expect(bacaProfil[0].kolom).toBe("dibuat_pada,diubah_pada,id,kecamatan_id,nama,nama_usaha,peran");
  });

  it("semua fungsi memasang search_path, dan tidak ada yang bisa dipanggil tamu", async () => {
    const fungsi = await db.admin(
      `select p.proname as nama,
              p.prosecdef as definer,
              coalesce(array_to_string(p.proconfig, ';'), '') as config,
              has_function_privilege('anon', p.oid, 'execute') as anon,
              has_function_privilege('authenticated', p.oid, 'execute') as login
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public'
       order by p.proname`,
    );
    expect(fungsi.length).toBeGreaterThan(10);
    expect(fungsi.filter((f) => !String(f.config).includes("search_path=")).map((f) => f.nama)).toEqual([]);
    expect(fungsi.filter((f) => f.anon).map((f) => f.nama)).toEqual([]);

    const bisaDipanggilLogin = fungsi.filter((f) => f.login).map((f) => f.nama);
    expect(bisaDipanggilLogin).toEqual([
      "batal_surplus",
      "batalkan_pesanan_kedaluwarsa",
      "buat_pesanan",
      "format_kg",
      "format_rupiah",
      "format_tanggal",
      "hari_ini_wib",
      "jarak_km",
      "kontak_pesanan",
      "label_status",
      "normalisasi_no_hp",
      "profil_saya",
      "tandai_surplus",
      "ubah_status",
    ]);

    const definer = fungsi.filter((f) => f.definer).map((f) => f.nama);
    expect(definer).toEqual([
      "batal_surplus",
      "batalkan_pesanan_kedaluwarsa",
      "buat_pesanan",
      "buat_profil_pengguna_baru",
      "kontak_pesanan",
      "profil_saya",
      "tandai_surplus",
      "ubah_status",
    ]);
  });

  it("fungsi yang butuh login menolak panggilan tanpa identitas pengguna", async () => {
    // service_role boleh mengeksekusi, tetapi tanpa auth.uid() fungsi menolak.
    const id = "00000000-0000-0000-0000-000000000000";
    const panggilan = [
      ["select public.buat_pesanan($1, 1)", [id]],
      ["select public.ubah_status($1, 'dikonfirmasi')", [id]],
      ["select public.tandai_surplus($1, 50000)", [id]],
      ["select public.batal_surplus($1)", [id]],
    ] as const;
    for (const [sql, params] of panggilan) {
      const g = await galatDari(() => db.sebagaiService((q) => q(sql, [...params])));
      expect(g.code).toBe("PP401");
    }
    const kosong = await db.sebagaiService((q) => q("select * from public.profil_saya()"));
    expect(kosong).toHaveLength(0);
  });
});

describe("format pesan notifikasi", () => {
  it.each([
    [20, "20"],
    [20.5, "20,5"],
    [0.56, "0,56"],
    [100, "100"],
    [1250.25, "1250,25"],
    [10.1, "10,1"],
  ])("format_kg(%s) = %s", async (masukan, harapan) => {
    const [{ teks }] = await db.admin("select public.format_kg($1::numeric) as teks", [masukan]);
    expect(teks).toBe(harapan);
  });

  it.each([
    [62000, "Rp62.000"],
    [500, "Rp500"],
    [1000000, "Rp1.000.000"],
    [0, "Rp0"],
  ])("format_rupiah(%s) = %s", async (masukan, harapan) => {
    const [{ teks }] = await db.admin("select public.format_rupiah($1::numeric) as teks", [masukan]);
    expect(teks).toBe(harapan);
  });

  it.each([
    ["2026-12-01", "1 Des 2026"],
    ["2026-05-17", "17 Mei 2026"],
    ["2026-08-09", "9 Agu 2026"],
    ["2026-10-31", "31 Okt 2026"],
  ])("format_tanggal(%s) = %s", async (masukan, harapan) => {
    const [{ teks }] = await db.admin("select public.format_tanggal($1::date) as teks", [masukan]);
    expect(teks).toBe(harapan);
  });

  it("hari_ini_wib mengikuti zona Asia/Jakarta", async () => {
    const [{ sama }] = await db.admin(
      "select public.hari_ini_wib() = (now() at time zone 'Asia/Jakarta')::date as sama",
    );
    expect(sama).toBe(true);
  });
});

describe("bucket foto listing", () => {
  it("dibuat publik dengan batas 5 MB dan hanya menerima gambar", async () => {
    const [b] = await db.admin("select * from storage.buckets where id = 'foto-listing'");
    expect(b).toMatchObject({
      public: true,
      allowed_mime_types: ["image/jpeg", "image/png", "image/webp"],
    });
    expect(Number(b.file_size_limit)).toBe(5 * 1024 * 1024);
  });

  it("pengguna hanya bisa mengunggah ke folder bernama id-nya sendiri", async () => {
    const a = await db.buatPengguna({ peran: "penjual" });
    const b = await db.buatPengguna({ peran: "penjual" });

    await db.sebagai(a, (q) =>
      q("insert into storage.objects (bucket_id, name) values ('foto-listing', $1)", [`${a}/cabai.jpg`]),
    );
    const g = await galatDari(() =>
      db.sebagai(a, (q) =>
        q("insert into storage.objects (bucket_id, name) values ('foto-listing', $1)", [`${b}/cabai.jpg`]),
      ),
    );
    expect(g.code).toBe("42501");

    const hapus = await db.sebagai(b, (q) =>
      q("delete from storage.objects where name = $1 returning id", [`${a}/cabai.jpg`]),
    );
    expect(hapus).toHaveLength(0);
  });
});
