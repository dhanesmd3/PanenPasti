import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DbUji, galatDari } from "./bantuan";

let db: DbUji;
let penjual: string;
let penjualLain: string;
let pembeli: string;
let pembeliLain: string;

beforeAll(async () => {
  db = await DbUji.buat();
  penjual = await db.buatPengguna({ peran: "penjual" });
  penjualLain = await db.buatPengguna({ peran: "penjual" });
  pembeli = await db.buatPengguna({ peran: "pembeli" });
  pembeliLain = await db.buatPengguna({ peran: "pembeli" });
}, 120_000);

afterAll(async () => {
  await db.tutup();
});

async function pesananSelesai(): Promise<string> {
  const listing = await db.buatListing(penjual);
  const order = await db.pesan(pembeli, listing, 5);
  await db.ubahStatus(penjual, order, "dikonfirmasi");
  await db.ubahStatus(penjual, order, "dikirim");
  await db.ubahStatus(pembeli, order, "selesai");
  return order;
}

const ulas = (siapa: string, order: string, bintang = 5, komentar: string | null = "Mantap") =>
  db.sebagai(siapa, (q) =>
    q("insert into public.ulasan (order_id, bintang, komentar) values ($1, $2, $3) returning *", [
      order,
      bintang,
      komentar,
    ]),
  );

describe("ulasan", () => {
  it("pembeli mengulas pesanan selesai; penjual & listing terisi otomatis", async () => {
    const order = await pesananSelesai();
    const [u] = await ulas(pembeli, order, 4, "  Segar  ");
    const o = await db.order(order);
    expect(u).toMatchObject({ pembeli_id: pembeli, penjual_id: penjual, listing_id: o.listing_id, bintang: 4, komentar: "Segar", balasan: null });
  });

  it("menolak pesanan yang belum selesai, pembeli lain, dan ulasan kedua", async () => {
    const listing = await db.buatListing(penjual);
    const belum = await db.pesan(pembeli, listing, 5);
    expect((await galatDari(() => ulas(pembeli, belum))).code).toBe("PP422");

    const order = await pesananSelesai();
    // RLS orders menyembunyikan pesanan orang lain, jadi terbaca "tidak ditemukan".
    expect((await galatDari(() => ulas(pembeliLain, order))).code).toBe("PP404");
    await ulas(pembeli, order);
    expect((await galatDari(() => ulas(pembeli, order))).code).toBe("23505");
  });

  it("penjual hanya bisa mengubah balasan; pihak lain tidak bisa", async () => {
    const order = await pesananSelesai();
    const [u] = await ulas(pembeli, order, 2, "Kurang segar");

    await db.sebagai(penjual, (q) =>
      q("update public.ulasan set balasan = 'Maaf, kami perbaiki' where id = $1", [u.id]),
    );
    const [baru] = await db.admin("select * from public.ulasan where id = $1", [u.id]);
    expect(baru).toMatchObject({ bintang: 2, komentar: "Kurang segar", balasan: "Maaf, kami perbaiki" });
    expect(baru.dibalas_pada).not.toBeNull();

    // Kolom selain balasan tidak punya hak update.
    expect((await galatDari(() => db.sebagai(penjual, (q) => q("update public.ulasan set bintang = 5 where id = $1", [u.id])))).code).toBe("42501");

    // Penjual lain & pembeli: RLS menyaring, tidak ada baris yang berubah.
    for (const siapa of [penjualLain, pembeli]) {
      const r = await db.sebagai(siapa, (q) =>
        q("update public.ulasan set balasan = 'x' where id = $1 returning id", [u.id]),
      );
      expect(r).toHaveLength(0);
    }
  });

  it("terlihat oleh semua pengguna login, tidak oleh tamu", async () => {
    const r = await db.sebagai(pembeliLain, (q) => q("select id from public.ulasan where penjual_id = $1", [penjual]));
    expect(r.length).toBeGreaterThan(0);
    expect((await galatDari(() => db.sebagaiTamu((q) => q("select id from public.ulasan")))).code).toBe("42501");
  });
});
