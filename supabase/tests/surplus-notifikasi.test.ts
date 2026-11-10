import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DbUji, galatDari, KECAMATAN } from "./bantuan";

let db: DbUji;
let penjual: string;
let penjualLain: string;
let pembeliBandung: string;
let pembeliBandung2: string;
let pembeliTanpaKecamatan: string;

beforeAll(async () => {
  db = await DbUji.buat();
  penjual = await db.buatPengguna({
    peran: "penjual",
    nama: "Cecep",
    nama_usaha: "Gapoktan Lembur Subur",
    kecamatan_id: KECAMATAN.cikajang,
  });
  penjualLain = await db.buatPengguna({ peran: "penjual", nama: "Dedeh", kecamatan_id: KECAMATAN.cisewu });
  pembeliBandung = await db.buatPengguna({ peran: "pembeli", nama: "Siti", kecamatan_id: KECAMATAN.sukajadi });
  pembeliBandung2 = await db.buatPengguna({ peran: "pembeli", nama: "Budi", kecamatan_id: KECAMATAN.cidadap });
  pembeliTanpaKecamatan = await db.buatPengguna({ peran: "pembeli", nama: "Rizky", kecamatan_id: null });
}, 120_000);

afterAll(async () => {
  await db.tutup();
});

const tandai = (siapa: string, listing: string, harga: number | null) =>
  db.sebagai(siapa, (q) => q("select * from public.tandai_surplus($1, $2)", [listing, harga]));
const lepas = (siapa: string, listing: string) =>
  db.sebagai(siapa, (q) => q("select * from public.batal_surplus($1)", [listing]));
const notifSurplus = async (userId: string, listing: string) =>
  (await db.notifikasi(userId)).filter((n) => n.tipe === "surplus" && n.listing_id === listing);

describe("jarak_km", () => {
  it("sama dengan haversine di lib/matching.ts untuk Cikajang → Sukajadi", async () => {
    const [{ km }] = await db.admin(
      `select public.jarak_km(a.lat, a.lng, b.lat, b.lng) as km
       from public.kecamatan a, public.kecamatan b
       where a.id = $1 and b.id = $2`,
      [KECAMATAN.cikajang, KECAMATAN.sukajadi],
    );
    const { jarakKm } = await import("@/lib/matching");
    const [a] = await db.admin("select lat, lng from public.kecamatan where id = $1", [KECAMATAN.cikajang]);
    const [b] = await db.admin("select lat, lng from public.kecamatan where id = $1", [KECAMATAN.sukajadi]);
    const harapan = jarakKm(
      { lat: Number(a.lat), lng: Number(a.lng) },
      { lat: Number(b.lat), lng: Number(b.lng) },
    );
    expect(Number(km)).toBeCloseTo(harapan, 6);
    expect(Number(km)).toBeGreaterThan(26);
    expect(Number(km)).toBeLessThan(100);
  });

  it("semua kecamatan Garut berjarak di bawah 100 km dari semua kecamatan Kota Bandung", async () => {
    const [{ terjauh }] = await db.admin(
      `select max(public.jarak_km(g.lat, g.lng, b.lat, b.lng)) as terjauh
       from public.kecamatan g, public.kecamatan b
       where g.kab_kota = 'Kab. Garut' and b.kab_kota = 'Kota Bandung'`,
    );
    expect(Number(terjauh)).toBeLessThan(100);
  });
});

describe("tandai_surplus", () => {
  it("memasang harga surplus dan memberi tahu pembeli di sekitar penjual", async () => {
    const listing = await db.buatListing(penjual, { jumlah_kg: 600, harga_per_kg: 56000, panen_dalam_hari: 2 });
    const [hasil] = await tandai(penjual, listing, 52000);
    expect(hasil).toMatchObject({ id: listing, is_surplus: true, harga_surplus: 52000, harga_per_kg: 56000 });

    for (const pembeli of [pembeliBandung, pembeliBandung2]) {
      const n = await notifSurplus(pembeli, listing);
      expect(n).toHaveLength(1);
      expect(n[0]).toMatchObject({ dibaca: false, order_id: null });
      expect(n[0].pesan).toContain("Gapoktan Lembur Subur");
      expect(n[0].pesan).toContain("600 kg cabai rawit merah");
      expect(n[0].pesan).toContain("Rp52.000/kg");
      expect(n[0].pesan).toContain("Rp56.000/kg");
    }
  });

  it("tidak memberi tahu penjual lain maupun pembeli yang kecamatannya kosong", async () => {
    const listing = await db.buatListing(penjual, { harga_per_kg: 56000 });
    await tandai(penjual, listing, 50000);
    for (const bukanSasaran of [penjual, penjualLain, pembeliTanpaKecamatan]) {
      expect(await notifSurplus(bukanSasaran, listing)).toHaveLength(0);
    }
  });

  it("memanggil ulang dengan harga yang sama tidak mengirim notifikasi lagi", async () => {
    const listing = await db.buatListing(penjual, { harga_per_kg: 56000 });
    await tandai(penjual, listing, 50000);
    await tandai(penjual, listing, 50000);
    expect(await notifSurplus(pembeliBandung, listing)).toHaveLength(1);
  });

  it("harga surplus berubah: notifikasi yang belum dibaca diganti, yang sudah dibaca tetap", async () => {
    const listing = await db.buatListing(penjual, { harga_per_kg: 56000 });
    await tandai(penjual, listing, 50000);
    await db.sebagai(pembeliBandung2, (q) =>
      q("update public.notifikasi set dibaca = true where listing_id = $1 and user_id = $2", [listing, pembeliBandung2]),
    );

    await tandai(penjual, listing, 45000);

    const belumBaca = await notifSurplus(pembeliBandung, listing);
    expect(belumBaca).toHaveLength(1);
    expect(belumBaca[0].pesan).toContain("Rp45.000/kg");

    const sudahBaca = await notifSurplus(pembeliBandung2, listing);
    expect(sudahBaca.map((n) => n.dibaca)).toEqual([true, false]);
  });

  it.each([
    { harga: 56000, ket: "sama dengan harga normal" },
    { harga: 60000, ket: "di atas harga normal" },
    { harga: 99, ket: "di bawah Rp100" },
    { harga: 0, ket: "nol" },
    { harga: null, ket: "kosong" },
  ])("menolak harga surplus $harga ($ket)", async ({ harga }) => {
    const listing = await db.buatListing(penjual, { harga_per_kg: 56000 });
    const g = await galatDari(() => tandai(penjual, listing, harga));
    expect(g.code).toBe("PP422");
    expect((await db.listing(listing)).is_surplus).toBe(false);
  });

  it("menolak listing yang stoknya habis", async () => {
    const listing = await db.buatListing(penjual, { jumlah_kg: 10, harga_per_kg: 56000 });
    await db.pesan(pembeliBandung, listing, 10);
    const g = await galatDari(() => tandai(penjual, listing, 50000));
    expect(g.code).toBe("PP409");
  });

  it("hanya pemilik listing yang bisa menandai surplus", async () => {
    const listing = await db.buatListing(penjual, { harga_per_kg: 56000 });
    for (const orangLain of [penjualLain, pembeliBandung]) {
      const g = await galatDari(() => tandai(orangLain, listing, 50000));
      expect(g.code).toBe("PP404");
    }
    const g = await galatDari(() => tandai(penjual, randomUUID(), 50000));
    expect(g.code).toBe("PP404");
    expect((await db.listing(listing)).is_surplus).toBe(false);
  });

  it("penjual tanpa kecamatan diminta melengkapi profil", async () => {
    const tanpaKecamatan = await db.buatPengguna({ peran: "penjual", kecamatan_id: null });
    const listing = await db.buatListing(tanpaKecamatan, { harga_per_kg: 56000 });
    const g = await galatDari(() => tandai(tanpaKecamatan, listing, 50000));
    expect(g.code).toBe("PP422");
    expect(g.message).toContain("kecamatan");
  });

  it("tamu tidak bisa memanggil tandai_surplus atau batal_surplus", async () => {
    const g1 = await galatDari(() =>
      db.sebagaiTamu((q) => q("select * from public.tandai_surplus($1, $2)", [randomUUID(), 50000])),
    );
    const g2 = await galatDari(() =>
      db.sebagaiTamu((q) => q("select * from public.batal_surplus($1)", [randomUUID()])),
    );
    expect([g1.code, g2.code]).toEqual(["42501", "42501"]);
  });
});

describe("batal_surplus dan perubahan harga normal", () => {
  it("melepas tanda surplus dan menarik notifikasi yang belum dibaca", async () => {
    const listing = await db.buatListing(penjual, { harga_per_kg: 56000 });
    await tandai(penjual, listing, 50000);
    const [hasil] = await lepas(penjual, listing);
    expect(hasil).toMatchObject({ is_surplus: false, harga_surplus: null });
    expect(await notifSurplus(pembeliBandung, listing)).toHaveLength(0);
  });

  it("aman dipanggil untuk listing yang tidak surplus", async () => {
    const listing = await db.buatListing(penjual);
    const [hasil] = await lepas(penjual, listing);
    expect(hasil.is_surplus).toBe(false);
  });

  it("hanya pemilik yang bisa melepas tanda surplus", async () => {
    const listing = await db.buatListing(penjual, { harga_per_kg: 56000 });
    await tandai(penjual, listing, 50000);
    const g = await galatDari(() => lepas(penjualLain, listing));
    expect(g.code).toBe("PP404");
    expect((await db.listing(listing)).is_surplus).toBe(true);
  });

  it("harga normal diturunkan sampai menyentuh harga surplus: tanda surplus dilepas", async () => {
    const listing = await db.buatListing(penjual, { harga_per_kg: 56000 });
    await tandai(penjual, listing, 50000);
    await db.sebagai(penjual, (q) => q("update public.listings set harga_per_kg = 50000 where id = $1", [listing]));
    expect(await db.listing(listing)).toMatchObject({ harga_per_kg: 50000, is_surplus: false, harga_surplus: null });
  });

  it("harga normal diubah tetapi masih di atas harga surplus: tanda surplus bertahan", async () => {
    const listing = await db.buatListing(penjual, { harga_per_kg: 56000 });
    await tandai(penjual, listing, 50000);
    await db.sebagai(penjual, (q) => q("update public.listings set harga_per_kg = 54000 where id = $1", [listing]));
    expect(await db.listing(listing)).toMatchObject({ harga_per_kg: 54000, is_surplus: true, harga_surplus: 50000 });
  });
});

describe("hak akses notifikasi", () => {
  let listing: string;

  beforeAll(async () => {
    listing = await db.buatListing(penjual, { harga_per_kg: 56000 });
    await tandai(penjual, listing, 51000);
  });

  it("pengguna hanya melihat notifikasinya sendiri", async () => {
    const milikSiti = await db.sebagai(pembeliBandung, (q) => q("select user_id from public.notifikasi"));
    expect(milikSiti.length).toBeGreaterThan(0);
    expect(new Set(milikSiti.map((n) => n.user_id))).toEqual(new Set([pembeliBandung]));
  });

  it("pengguna bisa menandai notifikasinya sudah dibaca", async () => {
    const ubah = await db.sebagai(pembeliBandung, (q) =>
      q("update public.notifikasi set dibaca = true where listing_id = $1 returning id, dibaca", [listing]),
    );
    expect(ubah).toHaveLength(1);
    expect(ubah[0].dibaca).toBe(true);
  });

  it("pengguna tidak bisa menandai notifikasi orang lain", async () => {
    const ubah = await db.sebagai(pembeliBandung, (q) =>
      q("update public.notifikasi set dibaca = true where user_id = $1 returning id", [pembeliBandung2]),
    );
    expect(ubah).toHaveLength(0);
    const milikBudi = await notifSurplus(pembeliBandung2, listing);
    expect(milikBudi[0].dibaca).toBe(false);
  });

  it("pengguna tidak bisa mengubah isi, membuat, atau menghapus notifikasi", async () => {
    const percobaan = [
      () => db.sebagai(pembeliBandung, (q) => q("update public.notifikasi set pesan = 'palsu' where listing_id = $1", [listing])),
      () => db.sebagai(pembeliBandung, (q) => q("update public.notifikasi set user_id = $1", [pembeliBandung])),
      () =>
        db.sebagai(pembeliBandung, (q) =>
          q("insert into public.notifikasi (user_id, tipe, pesan) values ($1, 'surplus', 'spam')", [pembeliBandung2]),
        ),
      () => db.sebagai(pembeliBandung, (q) => q("delete from public.notifikasi where user_id = $1", [pembeliBandung])),
      () => db.sebagaiTamu((q) => q("select id from public.notifikasi")),
    ];
    for (const coba of percobaan) {
      expect((await galatDari(coba)).code).toBe("42501");
    }
  });
});

describe("kebutuhan", () => {
  it("pembeli menyimpan kebutuhan; pemiliknya diisi server dan tidak terlihat orang lain", async () => {
    const [k] = await db.sebagai(pembeliBandung, (q) =>
      q(
        `insert into public.kebutuhan (pembeli_id, komoditas_id, jumlah_kg, tgl_butuh, berulang, teks_asli, dibuat_ai)
         values ($1, 1, 20, public.hari_ini_wib() + 7, 'mingguan:senin', 'butuh 20 kg cabai rawit tiap Senin', true)
         returning id, pembeli_id`,
        [pembeliBandung2],
      ),
    );
    expect(k.pembeli_id).toBe(pembeliBandung);

    const lihat = (siapa: string) =>
      db.sebagai(siapa, (q) => q("select id from public.kebutuhan where id = $1", [k.id]));
    expect(await lihat(pembeliBandung)).toHaveLength(1);
    expect(await lihat(pembeliBandung2)).toHaveLength(0);
    expect(await lihat(penjual)).toHaveLength(0);
  });

  it("penjual tidak bisa menyimpan kebutuhan", async () => {
    const g = await galatDari(() =>
      db.sebagai(penjual, (q) =>
        q("insert into public.kebutuhan (komoditas_id, jumlah_kg, tgl_butuh) values (1, 20, public.hari_ini_wib() + 7)"),
      ),
    );
    expect(g.code).toBe("PP403");
  });

  it("menolak pola berulang yang tidak dikenal", async () => {
    const g = await galatDari(() =>
      db.sebagai(pembeliBandung, (q) =>
        q(
          `insert into public.kebutuhan (komoditas_id, jumlah_kg, tgl_butuh, berulang)
           values (1, 20, public.hari_ini_wib() + 7, 'harian')`,
        ),
      ),
    );
    expect(g.code).toBe("23514");
  });
});
