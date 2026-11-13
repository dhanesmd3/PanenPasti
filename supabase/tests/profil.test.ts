import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DAFTAR_KOMODITAS } from "@/lib/komoditas";
import { DbUji, galatDari, KECAMATAN } from "./bantuan";

let db: DbUji;

beforeAll(async () => {
  db = await DbUji.buat();
}, 120_000);

afterAll(async () => {
  await db.tutup();
});

async function daftarMentah(meta: Record<string, unknown>, email?: string): Promise<string> {
  const id = randomUUID();
  await db.admin(
    "insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3::jsonb)",
    [id, email ?? `${id}@uji.test`, JSON.stringify(meta)],
  );
  return id;
}

describe("data referensi", () => {
  it("memuat 72 kecamatan (42 Garut, 30 Bandung) dan semua komoditas di lib/komoditas.ts", async () => {
    const kec = await db.admin(
      "select kab_kota, count(*)::int as n from public.kecamatan group by kab_kota order by kab_kota",
    );
    expect(kec).toEqual([
      { kab_kota: "Kab. Garut", n: 42 },
      { kab_kota: "Kota Bandung", n: 30 },
    ]);
    const kom = await db.admin("select id, nama, satuan from public.komoditas order by id");
    expect(kom).toEqual(DAFTAR_KOMODITAS.map((k) => ({ id: k.id, nama: k.nama, satuan: "kg" })));
  });

  it("bisa dibaca tanpa login, tetapi tidak bisa diubah", async () => {
    const jumlah = await db.sebagaiTamu((q) => q("select count(*)::int as n from public.kecamatan"));
    expect(jumlah[0].n).toBe(72);

    const g = await galatDari(() =>
      db.sebagaiTamu((q) => q("update public.kecamatan set nama = 'x' where id = $1", [KECAMATAN.cikajang])),
    );
    expect(g.code).toBe("42501");
  });
});

describe("profil dibuat otomatis saat akun dibuat", () => {
  it("menyalin metadata pendaftaran dan merapikan nomor HP", async () => {
    const id = await daftarMentah({
      peran: "penjual",
      nama: "  Asep Saepudin ",
      nama_usaha: " Kelompok Tani Pasir Hejo ",
      kecamatan_id: KECAMATAN.cikajang,
      no_hp: "0812-0000-0101",
    });
    const [p] = await db.admin("select * from public.profiles where id = $1", [id]);
    expect(p).toMatchObject({
      peran: "penjual",
      nama: "Asep Saepudin",
      nama_usaha: "Kelompok Tani Pasir Hejo",
      kecamatan_id: KECAMATAN.cikajang,
      no_hp: "6281200000101",
    });
  });

  it.each([
    ["+62 812 0000 0101", "6281200000101"],
    ["6281200000101", "6281200000101"],
    ["81200000101", "6281200000101"],
    ["(0812) 0000.0101", "6281200000101"],
  ])("nomor HP %s disimpan sebagai %s", async (masukan, harapan) => {
    const id = await daftarMentah({ peran: "pembeli", nama: "Uji", no_hp: masukan });
    const [p] = await db.admin("select no_hp from public.profiles where id = $1", [id]);
    expect(p.no_hp).toBe(harapan);
  });

  it("menerima metadata minimal dari skrip seed (peran dan nama saja)", async () => {
    const id = await daftarMentah({ peran: "pembeli", nama: "Siti Nurhaliza" });
    const [p] = await db.admin("select * from public.profiles where id = $1", [id]);
    expect(p).toMatchObject({ peran: "pembeli", nama: "Siti Nurhaliza", kecamatan_id: null, no_hp: null });
  });

  it("memakai bagian depan email jika nama kosong", async () => {
    const id = await daftarMentah({ peran: "pembeli" }, `warung.siti.${randomUUID()}@uji.test`);
    const [p] = await db.admin("select nama from public.profiles where id = $1", [id]);
    expect(p.nama).toMatch(/^warung\.siti\./);
  });

  it("mengosongkan kecamatan dan nomor HP yang tidak valid, tanpa menggagalkan pendaftaran", async () => {
    const id = await daftarMentah({ peran: "penjual", nama: "Uji", kecamatan_id: 999, no_hp: "12345" });
    const [p] = await db.admin("select kecamatan_id, no_hp from public.profiles where id = $1", [id]);
    expect(p).toEqual({ kecamatan_id: null, no_hp: null });
  });

  it.each([[{}], [{ peran: "admin", nama: "X" }], [{ peran: "", nama: "X" }]])(
    "menolak pendaftaran tanpa peran yang sah: %j",
    async (meta) => {
      const g = await galatDari(() => daftarMentah(meta));
      expect(g.code).toBe("PP422");
      expect(g.message).toContain("penjual atau pembeli");
    },
  );

  it("profil ikut terhapus saat akun dihapus", async () => {
    const id = await db.buatPengguna({ peran: "pembeli" });
    await db.admin("delete from auth.users where id = $1", [id]);
    const sisa = await db.admin("select 1 from public.profiles where id = $1", [id]);
    expect(sisa).toHaveLength(0);
  });
});

describe("Supabase Auth (role supabase_auth_admin, tanpa hak di skema public)", () => {
  it("bisa membuat akun: profil ditulis oleh trigger, bukan oleh role pemanggil", async () => {
    const id = randomUUID();
    await db.sebagaiAuthAdmin((q) =>
      q("insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3::jsonb)", [
        id,
        `${id}@uji.test`,
        JSON.stringify({ peran: "penjual", nama: "Lewat GoTrue", kecamatan_id: KECAMATAN.cikajang, no_hp: "081200000101" }),
      ]),
    );
    const [p] = await db.admin("select peran, nama, no_hp from public.profiles where id = $1", [id]);
    expect(p).toEqual({ peran: "penjual", nama: "Lewat GoTrue", no_hp: "6281200000101" });

    const g = await galatDari(() => db.sebagaiAuthAdmin((q) => q("select id from public.profiles")));
    expect(g.code).toBe("42501");
  });

  it("bisa menghapus akun yang sudah punya listing, pesanan, dan notifikasi", async () => {
    const penjual = await db.buatPengguna({ peran: "penjual" });
    const pembeli = await db.buatPengguna({ peran: "pembeli" });
    const listing = await db.buatListing(penjual);
    const order = await db.pesan(pembeli, listing, 10);
    await db.ubahStatus(penjual, order, "dikonfirmasi");

    await db.sebagaiAuthAdmin((q) => q("delete from auth.users where id = $1", [penjual]));

    expect(await db.admin("select 1 from public.profiles where id = $1", [penjual])).toHaveLength(0);
    expect(await db.listing(listing)).toBeUndefined();
    expect(await db.order(order)).toBeUndefined();
    expect(await db.admin("select 1 from public.notifikasi where order_id = $1", [order])).toHaveLength(0);
    // Akun pembeli tidak ikut terhapus.
    expect(await db.admin("select 1 from public.profiles where id = $1", [pembeli])).toHaveLength(1);

    await db.sebagaiAuthAdmin((q) => q("delete from auth.users where id = $1", [pembeli]));
    expect(await db.admin("select 1 from public.profiles where id = $1", [pembeli])).toHaveLength(0);
  });
});

describe("privasi dan hak ubah profil", () => {
  let penjual: string;
  let pembeli: string;

  beforeAll(async () => {
    penjual = await db.buatPengguna({ peran: "penjual", nama: "Penjual A", no_hp: "081200000101" });
    pembeli = await db.buatPengguna({ peran: "pembeli", nama: "Pembeli B", no_hp: "081200000201" });
  });

  it("pengguna lain bisa melihat nama dan kecamatan, tetapi bukan nomor HP", async () => {
    const baris = await db.sebagai(pembeli, (q) =>
      q("select id, peran, nama, nama_usaha, kecamatan_id from public.profiles where id = $1", [penjual]),
    );
    expect(baris[0]).toMatchObject({ nama: "Penjual A", peran: "penjual" });

    for (const sql of [
      "select no_hp from public.profiles where id = $1",
      "select * from public.profiles where id = $1",
    ]) {
      const g = await galatDari(() => db.sebagai(pembeli, (q) => q(sql, [penjual])));
      expect(g.code).toBe("42501");
    }
  });

  it("nomor HP sendiri pun tidak bisa di-select langsung; dibaca lewat profil_saya()", async () => {
    const g = await galatDari(() =>
      db.sebagai(pembeli, (q) => q("select no_hp from public.profiles where id = $1", [pembeli])),
    );
    expect(g.code).toBe("42501");

    const saya = await db.sebagai(pembeli, (q) => q("select * from public.profil_saya()"));
    expect(saya).toHaveLength(1);
    expect(saya[0]).toMatchObject({ id: pembeli, no_hp: "6281200000201", peran: "pembeli" });
  });

  it("tamu tidak bisa membaca profil maupun memanggil profil_saya()", async () => {
    const g1 = await galatDari(() => db.sebagaiTamu((q) => q("select id from public.profiles")));
    expect(g1.code).toBe("42501");
    const g2 = await galatDari(() => db.sebagaiTamu((q) => q("select * from public.profil_saya()")));
    expect(g2.code).toBe("42501");
  });

  it("pengguna bisa mengubah nama, usaha, kecamatan, dan nomor HP miliknya", async () => {
    await db.sebagai(pembeli, (q) =>
      q(
        "update public.profiles set nama = $2, nama_usaha = $3, kecamatan_id = $4, no_hp = $5 where id = $1",
        [pembeli, " Bu Siti ", "Warung Nasi Teh Siti", KECAMATAN.cidadap, "0813 1111 2222"],
      ),
    );
    const [p] = await db.admin("select * from public.profiles where id = $1", [pembeli]);
    expect(p).toMatchObject({
      nama: "Bu Siti",
      nama_usaha: "Warung Nasi Teh Siti",
      kecamatan_id: KECAMATAN.cidadap,
      no_hp: "6281311112222",
    });
  });

  it("menolak nomor HP yang tidak valid", async () => {
    const g = await galatDari(() =>
      db.sebagai(pembeli, (q) => q("update public.profiles set no_hp = '12345' where id = $1", [pembeli])),
    );
    expect(g.code).toBe("23514");
  });

  it("pengguna tidak bisa mengganti perannya sendiri", async () => {
    const g = await galatDari(() =>
      db.sebagai(pembeli, (q) => q("update public.profiles set peran = 'penjual' where id = $1", [pembeli])),
    );
    expect(g.code).toBe("42501");
    const [p] = await db.admin("select peran from public.profiles where id = $1", [pembeli]);
    expect(p.peran).toBe("pembeli");
  });

  it("pengguna tidak bisa mengubah profil orang lain", async () => {
    await db.sebagai(pembeli, (q) =>
      q("update public.profiles set nama = 'Diretas' where id = $1", [penjual]),
    );
    const [p] = await db.admin("select nama from public.profiles where id = $1", [penjual]);
    expect(p.nama).toBe("Penjual A");
  });

  it("pengguna tidak bisa membuat atau menghapus baris profil", async () => {
    const g1 = await galatDari(() =>
      db.sebagai(pembeli, (q) =>
        q("insert into public.profiles (id, peran, nama) values ($1, 'penjual', 'X')", [randomUUID()]),
      ),
    );
    expect(g1.code).toBe("42501");
    const g2 = await galatDari(() =>
      db.sebagai(pembeli, (q) => q("delete from public.profiles where id = $1", [pembeli])),
    );
    expect(g2.code).toBe("42501");
  });

  it("service role (skrip seed) boleh meng-upsert profil lengkap", async () => {
    await db.sebagaiService((q) =>
      q(
        `insert into public.profiles (id, peran, nama, nama_usaha, kecamatan_id, no_hp)
         values ($1, 'penjual', 'Asep Saepudin', 'Kelompok Tani (Simulasi)', $2, '6281200000101')
         on conflict (id) do update set
           peran = excluded.peran, nama = excluded.nama, nama_usaha = excluded.nama_usaha,
           kecamatan_id = excluded.kecamatan_id, no_hp = excluded.no_hp`,
        [penjual, KECAMATAN.cikajang],
      ),
    );
    const [p] = await db.admin("select nama, no_hp from public.profiles where id = $1", [penjual]);
    expect(p).toEqual({ nama: "Asep Saepudin", no_hp: "6281200000101" });
  });
});
