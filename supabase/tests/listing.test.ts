import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DbUji, galatDari, type Jalankan } from "./bantuan";

let db: DbUji;
let penjual: string;
let penjualLain: string;
let pembeli: string;

beforeAll(async () => {
  db = await DbUji.buat();
  penjual = await db.buatPengguna({ peran: "penjual", nama: "Penjual A" });
  penjualLain = await db.buatPengguna({ peran: "penjual", nama: "Penjual B" });
  pembeli = await db.buatPengguna({ peran: "pembeli", nama: "Pembeli" });
}, 120_000);

afterAll(async () => {
  await db.tutup();
});

/** Insert seperti yang dilakukan halaman Panen Saya lewat Supabase client. */
async function tambahListing(q: Jalankan, isi: Record<string, unknown> = {}): Promise<string> {
  const data = {
    komoditas_id: 1,
    jumlah_kg: 500,
    harga_per_kg: 62000,
    tgl_panen: null as string | null,
    ...isi,
  };
  const kolom = Object.keys(data).filter((k) => k !== "tgl_panen");
  const nilai = kolom.map((k) => (data as Record<string, unknown>)[k]);
  const tanggal = data.tgl_panen ? `'${data.tgl_panen}'::date` : "public.hari_ini_wib() + 21";
  const [baris] = await q(
    `insert into public.listings (${kolom.join(", ")}, tgl_panen)
     values (${kolom.map((_, i) => `$${i + 1}`).join(", ")}, ${tanggal})
     returning id`,
    nilai,
  );
  return String(baris.id);
}

describe("menambah listing", () => {
  it("penjual menambah listing; pemilik dan sisa stok diisi server", async () => {
    const id = await db.sebagai(penjual, (q) => tambahListing(q, { kualitas: "Super" }));
    const l = await db.listing(id);
    expect(l).toMatchObject({
      penjual_id: penjual,
      status: "estimasi",
      is_surplus: false,
      harga_surplus: null,
      harga_per_kg: 62000,
      kualitas: "Super",
    });
    expect(Number(l.jumlah_kg)).toBe(500);
    expect(Number(l.sisa_kg)).toBe(500);
  });

  it("nilai sisa_kg, surplus, dan pemilik kiriman klien diabaikan", async () => {
    const id = await db.sebagai(penjual, (q) =>
      tambahListing(q, {
        penjual_id: penjualLain,
        sisa_kg: 99999,
        is_surplus: true,
        harga_surplus: 100,
      }),
    );
    const l = await db.listing(id);
    expect(l.penjual_id).toBe(penjual);
    expect(Number(l.sisa_kg)).toBe(500);
    expect(l.is_surplus).toBe(false);
    expect(l.harga_surplus).toBeNull();
  });

  it("pembeli tidak bisa menambah listing", async () => {
    const g = await galatDari(() => db.sebagai(pembeli, (q) => tambahListing(q)));
    expect(g.code).toBe("PP403");
  });

  it("tamu tidak bisa menambah atau membaca listing", async () => {
    const g1 = await galatDari(() => db.sebagaiTamu((q) => tambahListing(q)));
    expect(g1.code).toBe("42501");
    const g2 = await galatDari(() => db.sebagaiTamu((q) => q("select id from public.listings")));
    expect(g2.code).toBe("42501");
  });

  it("menolak tanggal panen di masa lalu, menerima hari ini", async () => {
    const [{ kemarin, hari_ini }] = await db.admin(
      "select (public.hari_ini_wib() - 1)::text as kemarin, public.hari_ini_wib()::text as hari_ini",
    );
    const g = await galatDari(() =>
      db.sebagai(penjual, (q) => tambahListing(q, { tgl_panen: kemarin })),
    );
    expect(g.code).toBe("PP422");
    expect(g.message).toContain("masa lalu");

    const id = await db.sebagai(penjual, (q) => tambahListing(q, { tgl_panen: hari_ini, status: "siap" }));
    expect((await db.listing(id)).status).toBe("siap");
  });

  it("menolak status habis untuk listing baru", async () => {
    const g = await galatDari(() => db.sebagai(penjual, (q) => tambahListing(q, { status: "habis" })));
    expect(g.code).toBe("PP422");
  });

  it.each([
    [{ jumlah_kg: 0 }],
    [{ jumlah_kg: -5 }],
    [{ jumlah_kg: 100001 }],
    [{ harga_per_kg: 999 }],
    [{ harga_per_kg: 1000001 }],
    [{ status: "ngawur" }],
  ])("menolak nilai di luar batas wajar: %j", async (isi) => {
    const g = await galatDari(() => db.sebagai(penjual, (q) => tambahListing(q, isi)));
    expect(g.code).toBe("23514");
  });

  it("service role bisa menambah listing dengan tanggal lampau (data seed)", async () => {
    const id = await db.buatListing(penjual, { panen_dalam_hari: -2, status: "siap" });
    expect(Number((await db.listing(id)).sisa_kg)).toBe(100);
  });

  it("service role bisa memasukkan listing surplus apa adanya (bentuk data scripts/seed-simulasi.mjs)", async () => {
    const [baris] = await db.sebagaiService((q) =>
      q(
        `insert into public.listings
           (penjual_id, komoditas_id, jumlah_kg, sisa_kg, kualitas, tgl_panen, harga_per_kg, status, is_surplus, harga_surplus)
         values ($1, 1, 600, 600, 'Sedang', public.hari_ini_wib() + 2, 56000, 'siap', true, 52000)
         returning id`,
        [penjual],
      ),
    );
    expect(await db.listing(String(baris.id))).toMatchObject({
      status: "siap",
      is_surplus: true,
      harga_surplus: 52000,
    });
  });

  it("service role pun tidak bisa memberi listing ke pembeli", async () => {
    const g = await galatDari(() => db.buatListing(pembeli));
    expect(g.code).toBe("PP403");
  });
});

describe("membaca listing", () => {
  it("semua pengguna yang login bisa melihat listing siapa pun", async () => {
    const id = await db.buatListing(penjual);
    for (const siapa of [pembeli, penjualLain]) {
      const baris = await db.sebagai(siapa, (q) => q("select id from public.listings where id = $1", [id]));
      expect(baris).toHaveLength(1);
    }
  });
});

describe("mengubah listing", () => {
  it("pemilik bisa mengubah harga, kualitas, tanggal, dan status", async () => {
    const id = await db.buatListing(penjual);
    await db.sebagai(penjual, (q) =>
      q(
        `update public.listings
         set harga_per_kg = 58000, kualitas = 'Sedang', tgl_panen = public.hari_ini_wib() + 3, status = 'siap'
         where id = $1`,
        [id],
      ),
    );
    expect(await db.listing(id)).toMatchObject({ harga_per_kg: 58000, kualitas: "Sedang", status: "siap" });
  });

  it("kolom yang dilindungi tidak ikut berubah walau dikirim klien", async () => {
    const id = await db.buatListing(penjual, { jumlah_kg: 100 });
    await db.sebagai(penjual, (q) =>
      q(
        `update public.listings
         set sisa_kg = 5, is_surplus = true, harga_surplus = 1000, penjual_id = $2, kualitas = 'Super'
         where id = $1`,
        [id, penjualLain],
      ),
    );
    const l = await db.listing(id);
    expect(Number(l.sisa_kg)).toBe(100);
    expect(l).toMatchObject({ is_surplus: false, harga_surplus: null, penjual_id: penjual, kualitas: "Super" });
  });

  it("penjual lain tidak bisa mengubah atau menghapus listing ini", async () => {
    const id = await db.buatListing(penjual, { harga_per_kg: 60000 });
    const ubah = await db.sebagai(penjualLain, (q) =>
      q("update public.listings set harga_per_kg = 1000 where id = $1 returning id", [id]),
    );
    expect(ubah).toHaveLength(0);
    const hapus = await db.sebagai(penjualLain, (q) =>
      q("delete from public.listings where id = $1 returning id", [id]),
    );
    expect(hapus).toHaveLength(0);
    expect((await db.listing(id)).harga_per_kg).toBe(60000);
  });

  it("pembeli tidak bisa mengubah listing", async () => {
    const id = await db.buatListing(penjual, { harga_per_kg: 60000 });
    const ubah = await db.sebagai(pembeli, (q) =>
      q("update public.listings set harga_per_kg = 1000 where id = $1 returning id", [id]),
    );
    expect(ubah).toHaveLength(0);
  });

  it("mengubah jumlah panen menggeser sisa stok sebesar selisihnya", async () => {
    const id = await db.buatListing(penjual, { jumlah_kg: 500 });
    await db.pesan(pembeli, id, 200);

    await db.sebagai(penjual, (q) => q("update public.listings set jumlah_kg = 600 where id = $1", [id]));
    let l = await db.listing(id);
    expect([Number(l.jumlah_kg), Number(l.sisa_kg)]).toEqual([600, 400]);

    await db.sebagai(penjual, (q) => q("update public.listings set jumlah_kg = 250 where id = $1", [id]));
    l = await db.listing(id);
    expect([Number(l.jumlah_kg), Number(l.sisa_kg)]).toEqual([250, 50]);
  });

  it("jumlah panen tidak boleh lebih kecil dari yang sudah dipesan", async () => {
    const id = await db.buatListing(penjual, { jumlah_kg: 500 });
    await db.pesan(pembeli, id, 200);
    const g = await galatDari(() =>
      db.sebagai(penjual, (q) => q("update public.listings set jumlah_kg = 150 where id = $1", [id])),
    );
    expect(g.code).toBe("PP409");
    expect(g.message).toContain("200 kg");
  });

  it("jumlah diturunkan tepat ke yang sudah dipesan: stok 0 dan status habis", async () => {
    const id = await db.buatListing(penjual, { jumlah_kg: 500 });
    await db.pesan(pembeli, id, 200);
    await db.sebagai(penjual, (q) => q("update public.listings set jumlah_kg = 200 where id = $1", [id]));
    const l = await db.listing(id);
    expect(Number(l.sisa_kg)).toBe(0);
    expect(l.status).toBe("habis");
  });

  it("tanggal panen tidak bisa digeser ke masa lalu", async () => {
    const id = await db.buatListing(penjual);
    const g = await galatDari(() =>
      db.sebagai(penjual, (q) =>
        q("update public.listings set tgl_panen = public.hari_ini_wib() - 1 where id = $1", [id]),
      ),
    );
    expect(g.code).toBe("PP422");
  });

  it("listing lama dengan tanggal lampau tetap bisa diubah harganya", async () => {
    const id = await db.buatListing(penjual, { panen_dalam_hari: -3, status: "siap" });
    await db.sebagai(penjual, (q) => q("update public.listings set harga_per_kg = 55000 where id = $1", [id]));
    expect((await db.listing(id)).harga_per_kg).toBe(55000);
  });
});

describe("menghapus listing", () => {
  it("pemilik bisa menghapus listing yang belum punya pesanan", async () => {
    const id = await db.buatListing(penjual);
    const hapus = await db.sebagai(penjual, (q) =>
      q("delete from public.listings where id = $1 returning id", [id]),
    );
    expect(hapus).toHaveLength(1);
  });

  it("listing yang sudah punya pesanan tidak bisa dihapus penjual, walau pesanannya sudah batal", async () => {
    const id = await db.buatListing(penjual);
    const order = await db.pesan(pembeli, id, 10);
    await db.ubahStatus(pembeli, order, "dibatalkan");

    const g = await galatDari(() =>
      db.sebagai(penjual, (q) => q("delete from public.listings where id = $1", [id])),
    );
    expect(g.code).toBe("PP409");
    expect(g.message).toContain("habis");
    expect(await db.listing(id)).toBeDefined();
  });

  it("service role (skrip seed) bisa menghapus listing beserta pesanan dan notifikasinya", async () => {
    const id = await db.buatListing(penjual);
    const order = await db.pesan(pembeli, id, 10);
    await db.sebagaiService((q) => q("delete from public.listings where penjual_id = $1 and id = $2", [penjual, id]));

    expect(await db.listing(id)).toBeUndefined();
    expect(await db.order(order)).toBeUndefined();
    const notif = await db.admin("select 1 from public.notifikasi where order_id = $1", [order]);
    expect(notif).toHaveLength(0);
  });

  it("id acak tidak menimbulkan galat", async () => {
    const hapus = await db.sebagai(penjual, (q) =>
      q("delete from public.listings where id = $1 returning id", [randomUUID()]),
    );
    expect(hapus).toHaveLength(0);
  });
});
