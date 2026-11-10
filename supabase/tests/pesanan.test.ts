import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { bolehPindah, kontakTerbuka, STATUS_MENGEMBALIKAN_STOK, STATUS_PESANAN } from "@/lib/pesanan";
import type { OrderStatus } from "@/types";
import { DbUji, galatDari } from "./bantuan";

let db: DbUji;
let penjual: string;
let penjualLain: string;
let pembeli: string;
let pembeliLain: string;

beforeAll(async () => {
  db = await DbUji.buat();
  penjual = await db.buatPengguna({
    peran: "penjual",
    nama: "Asep",
    nama_usaha: "Tani Pasir Hejo",
    no_hp: "081200000101",
  });
  penjualLain = await db.buatPengguna({ peran: "penjual", nama: "Dedeh" });
  pembeli = await db.buatPengguna({
    peran: "pembeli",
    nama: "Siti",
    nama_usaha: "Warung Teh Siti",
    no_hp: "081200000201",
  });
  pembeliLain = await db.buatPengguna({ peran: "pembeli", nama: "Budi" });
}, 120_000);

afterAll(async () => {
  await db.tutup();
});

/** Pesanan dengan status tertentu, dibuat langsung tanpa lewat alur (stok tidak disentuh). */
async function pesananBerstatus(listingId: string, status: OrderStatus, jumlah = 10): Promise<string> {
  const [baris] = await db.admin(
    `insert into public.orders (listing_id, pembeli_id, jumlah_kg, harga_per_kg, status)
     values ($1, $2, $3, 60000, $4) returning id`,
    [listingId, pembeli, jumlah, status],
  );
  return String(baris.id);
}

describe("buat_pesanan", () => {
  it("mengunci stok, menyimpan harga saat itu, dan memberi tahu penjual", async () => {
    const listing = await db.buatListing(penjual, { jumlah_kg: 500, harga_per_kg: 62000 });
    const [order] = await db.sebagai(pembeli, (q) =>
      q("select * from public.buat_pesanan($1, $2)", [listing, 20]),
    );

    expect(order).toMatchObject({
      listing_id: listing,
      pembeli_id: pembeli,
      kebutuhan_id: null,
      harga_per_kg: 62000,
      status: "menunggu",
      alasan_batal: null,
    });
    expect(Number(order.jumlah_kg)).toBe(20);
    expect(Number((await db.listing(listing)).sisa_kg)).toBe(480);

    const notif = await db.notifikasi(penjual);
    const baru = notif.filter((n) => n.order_id === order.id);
    expect(baru).toHaveLength(1);
    expect(baru[0]).toMatchObject({ tipe: "pesanan_baru", dibaca: false, listing_id: listing });
    expect(baru[0].pesan).toContain("Warung Teh Siti");
    expect(baru[0].pesan).toContain("20 kg cabai rawit merah");
    expect(await db.notifikasi(pembeli)).toHaveLength(0);
  });

  it("perubahan harga listing setelah itu tidak mengubah harga pesanan", async () => {
    const listing = await db.buatListing(penjual, { harga_per_kg: 62000 });
    const order = await db.pesan(pembeli, listing, 5);
    await db.sebagai(penjual, (q) => q("update public.listings set harga_per_kg = 70000 where id = $1", [listing]));
    expect((await db.order(order)).harga_per_kg).toBe(62000);
  });

  it("memakai harga surplus jika listing ditandai surplus", async () => {
    const listing = await db.buatListing(penjual, { harga_per_kg: 56000 });
    await db.sebagai(penjual, (q) => q("select public.tandai_surplus($1, $2)", [listing, 52000]));
    const order = await db.pesan(pembeli, listing, 5);
    expect((await db.order(order)).harga_per_kg).toBe(52000);
  });

  it("menerima jumlah pecahan dan membulatkan ke 2 desimal", async () => {
    const listing = await db.buatListing(penjual, { jumlah_kg: 10 });
    const order = await db.pesan(pembeli, listing, 0.555);
    expect(Number((await db.order(order)).jumlah_kg)).toBe(0.56);
    expect(Number((await db.listing(listing)).sisa_kg)).toBe(9.44);
  });

  it("memesan seluruh sisa stok membuat listing habis", async () => {
    const listing = await db.buatListing(penjual, { jumlah_kg: 100 });
    await db.pesan(pembeli, listing, 100);
    const l = await db.listing(listing);
    expect(Number(l.sisa_kg)).toBe(0);
    expect(l.status).toBe("habis");

    const g = await galatDari(() => db.pesan(pembeliLain, listing, 1));
    expect(g.code).toBe("PP409");
    expect(g.message).toContain("habis");
  });

  it("menolak pesanan yang melebihi sisa stok dan tidak mengubah apa pun", async () => {
    const listing = await db.buatListing(penjual, { jumlah_kg: 100 });
    const g = await galatDari(() => db.pesan(pembeli, listing, 100.01));
    expect(g.code).toBe("PP409");
    expect(g.message).toContain("Sisa stok 100 kg");
    expect(Number((await db.listing(listing)).sisa_kg)).toBe(100);
    const pesanan = await db.admin("select 1 from public.orders where listing_id = $1", [listing]);
    expect(pesanan).toHaveLength(0);
  });

  it("dua pesanan berturut-turut tidak membuat stok minus", async () => {
    const listing = await db.buatListing(penjual, { jumlah_kg: 100 });
    await db.pesan(pembeli, listing, 60);
    const g = await galatDari(() => db.pesan(pembeliLain, listing, 60));
    expect(g.code).toBe("PP409");
    expect(g.message).toContain("Sisa stok 40 kg");
    expect(Number((await db.listing(listing)).sisa_kg)).toBe(40);
  });

  it("menolak listing yang ditutup penjual (status habis) walau stok masih ada", async () => {
    const listing = await db.buatListing(penjual, { jumlah_kg: 100 });
    await db.sebagai(penjual, (q) => q("update public.listings set status = 'habis' where id = $1", [listing]));
    const g = await galatDari(() => db.pesan(pembeli, listing, 10));
    expect(g.code).toBe("PP409");
  });

  it.each([[0], [-1], [100001], [0.004], [null]])("menolak jumlah %s", async (jumlah) => {
    const listing = await db.buatListing(penjual);
    const g = await galatDari(() =>
      db.sebagai(pembeli, (q) => q("select * from public.buat_pesanan($1, $2)", [listing, jumlah])),
    );
    expect(g.code).toBe("PP422");
  });

  it("penjual tidak bisa membuat pesanan", async () => {
    const listing = await db.buatListing(penjual);
    const g = await galatDari(() => db.pesan(penjualLain, listing, 10));
    expect(g.code).toBe("PP403");
  });

  it("tamu tidak bisa memanggil buat_pesanan", async () => {
    const listing = await db.buatListing(penjual);
    const g = await galatDari(() =>
      db.sebagaiTamu((q) => q("select * from public.buat_pesanan($1, $2)", [listing, 10])),
    );
    expect(g.code).toBe("42501");
  });

  it("listing yang tidak ada dijawab 404", async () => {
    const g = await galatDari(() => db.pesan(pembeli, randomUUID(), 10));
    expect(g.code).toBe("PP404");
  });

  it("menautkan kebutuhan milik sendiri, menolak kebutuhan milik orang lain", async () => {
    const listing = await db.buatListing(penjual);
    const [k] = await db.sebagai(pembeli, (q) =>
      q(
        `insert into public.kebutuhan (komoditas_id, jumlah_kg, tgl_butuh, berulang, teks_asli, dibuat_ai)
         values (1, 20, public.hari_ini_wib() + 14, 'mingguan:senin', 'butuh 20 kg tiap Senin', true)
         returning id`,
      ),
    );
    const [order] = await db.sebagai(pembeli, (q) =>
      q("select * from public.buat_pesanan($1, $2, $3)", [listing, 20, k.id]),
    );
    expect(order.kebutuhan_id).toBe(k.id);

    const g = await galatDari(() =>
      db.sebagai(pembeliLain, (q) => q("select * from public.buat_pesanan($1, $2, $3)", [listing, 5, k.id])),
    );
    expect(g.code).toBe("PP422");
  });
});

describe("ubah_status: perpindahan yang sah", () => {
  // Setiap kombinasi (status awal, status tujuan, pelaku) dicoba ke database dan
  // dibandingkan dengan tabel TRANSISI di lib/pesanan.ts.
  const pelakuUji = ["penjual", "pembeli"] as const;
  const kasus = STATUS_PESANAN.flatMap((dari) =>
    STATUS_PESANAN.flatMap((ke) => pelakuUji.map((pelaku) => [dari, ke, pelaku] as const)),
  );

  it.each(kasus)("%s → %s oleh %s sama dengan tabel TRANSISI", async (dari, ke, pelaku) => {
    const listing = await db.buatListing(penjual);
    const order = await pesananBerstatus(listing, dari);
    const siapa = pelaku === "penjual" ? penjual : pembeli;
    const harusBoleh = bolehPindah(dari, ke, pelaku);

    if (harusBoleh) {
      const hasil = await db.ubahStatus(siapa, order, ke, "hujan terus dua minggu");
      expect(hasil.status).toBe(ke);
    } else {
      const g = await galatDari(() => db.ubahStatus(siapa, order, ke, "hujan terus dua minggu"));
      expect(["PP403", "PP409"]).toContain(g.code);
      expect((await db.order(order)).status).toBe(dari);
    }
  });

  it("orang di luar pesanan mendapat 404 untuk semua perpindahan", async () => {
    const listing = await db.buatListing(penjual);
    for (const dari of STATUS_PESANAN) {
      const order = await pesananBerstatus(listing, dari);
      for (const orangLuar of [penjualLain, pembeliLain]) {
        for (const ke of STATUS_PESANAN) {
          const g = await galatDari(() => db.ubahStatus(orangLuar, order, ke, "alasan apa pun"));
          expect(g.code).toBe("PP404");
        }
      }
      expect((await db.order(order)).status).toBe(dari);
    }
  });

  it("status tujuan yang tidak dikenal ditolak", async () => {
    const listing = await db.buatListing(penjual);
    const order = await pesananBerstatus(listing, "menunggu");
    for (const status of ["ngawur", "", null]) {
      const g = await galatDari(() =>
        db.sebagai(penjual, (q) => q("select * from public.ubah_status($1, $2)", [order, status])),
      );
      expect(g.code).toBe("PP422");
    }
  });

  it("pesanan yang tidak ada dijawab 404", async () => {
    const g = await galatDari(() => db.ubahStatus(penjual, randomUUID(), "dikonfirmasi"));
    expect(g.code).toBe("PP404");
  });

  it("tamu tidak bisa memanggil ubah_status", async () => {
    const g = await galatDari(() =>
      db.sebagaiTamu((q) => q("select * from public.ubah_status($1, $2)", [randomUUID(), "dikonfirmasi"])),
    );
    expect(g.code).toBe("42501");
  });
});

describe("ubah_status: stok dan notifikasi", () => {
  async function alurSampai(status: OrderStatus, jumlah = 30) {
    const listing = await db.buatListing(penjual, { jumlah_kg: 100 });
    const order = await db.pesan(pembeli, listing, jumlah);
    const langkah: Partial<Record<OrderStatus, [string, OrderStatus][]>> = {
      menunggu: [],
      dikonfirmasi: [[penjual, "dikonfirmasi"]],
      dikirim: [
        [penjual, "dikonfirmasi"],
        [penjual, "dikirim"],
      ],
    };
    for (const [siapa, ke] of langkah[status] ?? []) await db.ubahStatus(siapa, order, ke);
    return { listing, order };
  }

  const sisa = async (listing: string) => Number((await db.listing(listing)).sisa_kg);
  const notifTerakhir = async (userId: string, order: string) =>
    (await db.notifikasi(userId)).filter((n) => n.order_id === order).at(-1);

  it.each([
    ["menunggu", "dikonfirmasi", "penjual"],
    ["menunggu", "ditolak", "penjual"],
    ["menunggu", "dibatalkan", "pembeli"],
    ["dikonfirmasi", "dikirim", "penjual"],
    ["dikonfirmasi", "gagal_panen", "penjual"],
    ["dikirim", "selesai", "pembeli"],
  ] as const)("%s → %s: stok dan notifikasi pihak lawan benar", async (dari, ke, pelaku) => {
    const { listing, order } = await alurSampai(dari, 30);
    expect(await sisa(listing)).toBe(70);

    const siapa = pelaku === "penjual" ? penjual : pembeli;
    const lawan = pelaku === "penjual" ? pembeli : penjual;
    const sebelumLawan = (await db.notifikasi(lawan)).length;
    const sebelumPelaku = (await db.notifikasi(siapa)).length;

    await db.ubahStatus(siapa, order, ke, "hujan terus dua minggu");

    expect(await sisa(listing)).toBe(STATUS_MENGEMBALIKAN_STOK.includes(ke) ? 100 : 70);
    expect((await db.notifikasi(siapa)).length).toBe(sebelumPelaku);
    expect((await db.notifikasi(lawan)).length).toBeGreaterThan(sebelumLawan);

    const n = (await db.notifikasi(lawan)).filter((x) => x.order_id === order && x.tipe === "status_berubah").at(-1);
    expect(n).toMatchObject({ tipe: "status_berubah", dibaca: false, listing_id: listing });
    expect(n?.pesan).toContain("30 kg cabai rawit merah");
  });

  it("alasan disimpan saat ditolak dan muncul di notifikasi", async () => {
    const { order } = await alurSampai("menunggu");
    const hasil = await db.ubahStatus(penjual, order, "ditolak", "  stok sudah dijanjikan ke pembeli lain ");
    expect(hasil.alasan_batal).toBe("stok sudah dijanjikan ke pembeli lain");
    expect((await notifTerakhir(pembeli, order))?.pesan).toContain("Alasan: stok sudah dijanjikan");
  });

  it("alasan tidak disimpan untuk perpindahan yang bukan pembatalan", async () => {
    const { order } = await alurSampai("menunggu");
    const hasil = await db.ubahStatus(penjual, order, "dikonfirmasi", "tidak relevan");
    expect(hasil.alasan_batal).toBeNull();
  });

  it("gagal panen wajib beralasan", async () => {
    const { listing, order } = await alurSampai("dikonfirmasi");
    for (const alasan of [null, "", "  ", "ab"]) {
      const g = await galatDari(() => db.ubahStatus(penjual, order, "gagal_panen", alasan));
      expect(g.code).toBe("PP422");
    }
    expect((await db.order(order)).status).toBe("dikonfirmasi");
    expect(await sisa(listing)).toBe(70);
  });

  it("alasan lebih dari 300 karakter ditolak", async () => {
    const { order } = await alurSampai("menunggu");
    const g = await galatDari(() => db.ubahStatus(penjual, order, "ditolak", "x".repeat(301)));
    expect(g.code).toBe("PP422");
  });

  it("mengulang perpindahan yang sama dijawab 409 dan stok tidak dikembalikan dua kali", async () => {
    const { listing, order } = await alurSampai("menunggu");
    await db.ubahStatus(pembeli, order, "dibatalkan");
    const g = await galatDari(() => db.ubahStatus(pembeli, order, "dibatalkan"));
    expect(g.code).toBe("PP409");
    expect(g.message).toContain("sudah berstatus Dibatalkan");
    expect(await sisa(listing)).toBe(100);
  });

  it("listing yang habis kembali tersedia setelah pesanan dibatalkan", async () => {
    const mendatang = await db.buatListing(penjual, { jumlah_kg: 50, panen_dalam_hari: 10 });
    const o1 = await db.pesan(pembeli, mendatang, 50);
    expect((await db.listing(mendatang)).status).toBe("habis");
    await db.ubahStatus(pembeli, o1, "dibatalkan");
    expect((await db.listing(mendatang)).status).toBe("estimasi");

    const sudahPanen = await db.buatListing(penjual, { jumlah_kg: 50, panen_dalam_hari: 0, status: "siap" });
    const o2 = await db.pesan(pembeli, sudahPanen, 50);
    expect((await db.listing(sudahPanen)).status).toBe("habis");
    await db.ubahStatus(penjual, o2, "ditolak");
    expect((await db.listing(sudahPanen)).status).toBe("siap");
  });

  it("gagal panen memberi tahu pembeli jika ada penjual pengganti di sekitar tanggal itu", async () => {
    const { listing, order } = await alurSampai("dikonfirmasi");
    const pengganti = await db.buatListing(penjualLain, { jumlah_kg: 200, panen_dalam_hari: 16 });

    await db.ubahStatus(penjual, order, "gagal_panen", "tanaman terserang patek");

    const notif = (await db.notifikasi(pembeli)).filter((n) => n.order_id === order);
    expect(notif.map((n) => n.tipe)).toEqual(["status_berubah", "status_berubah", "pengganti_tersedia"]);
    expect(notif[1].pesan).toContain("gagal panen");
    expect(notif[1].pesan).toContain("tanaman terserang patek");
    expect(notif[2].pesan).toContain("penjual pengganti");
    expect(await sisa(listing)).toBe(100);

    await db.admin("delete from public.listings where id = $1", [pengganti]);
  });

  it("tanpa pengganti yang cocok, tidak ada notifikasi pengganti", async () => {
    // Listing lain milik penjual yang sama, listing yang terlalu jauh tanggalnya,
    // dan listing yang habis tidak dihitung sebagai pengganti.
    await db.admin("update public.listings set status = 'habis' where penjual_id = $1", [penjualLain]);
    const { order } = await alurSampai("dikonfirmasi");
    await db.buatListing(penjual, { panen_dalam_hari: 14 });
    await db.buatListing(penjualLain, { panen_dalam_hari: 30 });

    await db.ubahStatus(penjual, order, "gagal_panen", "banjir di lahan");

    const tipe = (await db.notifikasi(pembeli)).filter((n) => n.order_id === order).map((n) => n.tipe);
    expect(tipe).not.toContain("pengganti_tersedia");
  });
});

describe("hak akses orders", () => {
  it("pesanan hanya terlihat oleh pembelinya dan penjual pemilik listing", async () => {
    const listing = await db.buatListing(penjual);
    const order = await db.pesan(pembeli, listing, 10);
    const lihat = (siapa: string) =>
      db.sebagai(siapa, (q) => q("select id from public.orders where id = $1", [order]));

    expect(await lihat(pembeli)).toHaveLength(1);
    expect(await lihat(penjual)).toHaveLength(1);
    expect(await lihat(pembeliLain)).toHaveLength(0);
    expect(await lihat(penjualLain)).toHaveLength(0);
  });

  it("klien tidak bisa menulis tabel orders secara langsung", async () => {
    const listing = await db.buatListing(penjual);
    const order = await db.pesan(pembeli, listing, 10);

    const percobaan = [
      () =>
        db.sebagai(pembeli, (q) =>
          q(
            `insert into public.orders (listing_id, pembeli_id, jumlah_kg, harga_per_kg, status)
             values ($1, $2, 1, 1, 'selesai')`,
            [listing, pembeli],
          ),
        ),
      () => db.sebagai(pembeli, (q) => q("update public.orders set harga_per_kg = 1 where id = $1", [order])),
      () => db.sebagai(penjual, (q) => q("update public.orders set status = 'selesai' where id = $1", [order])),
      () => db.sebagai(pembeli, (q) => q("delete from public.orders where id = $1", [order])),
      () => db.sebagaiTamu((q) => q("select id from public.orders")),
    ];
    for (const coba of percobaan) {
      expect((await galatDari(coba)).code).toBe("42501");
    }
    expect(await db.order(order)).toMatchObject({ status: "menunggu", harga_per_kg: 60000 });
  });
});

describe("kontak pihak lawan", () => {
  const kontak = (siapa: string, order?: string) =>
    db.sebagai(siapa, (q) =>
      order
        ? q("select * from public.kontak_pesanan($1)", [order])
        : q("select * from public.kontak_pesanan()"),
    );

  it("mengikuti aturan status yang sama dengan lib/pesanan.ts", async () => {
    const listing = await db.buatListing(penjual);
    for (const status of STATUS_PESANAN) {
      const order = await pesananBerstatus(listing, status);
      const untukPembeli = await kontak(pembeli, order);
      const untukPenjual = await kontak(penjual, order);

      if (kontakTerbuka(status)) {
        expect(untukPembeli).toHaveLength(1);
        expect(untukPembeli[0]).toMatchObject({
          order_id: order,
          user_id: penjual,
          peran: "penjual",
          nama: "Asep",
          nama_usaha: "Tani Pasir Hejo",
          no_hp: "6281200000101",
        });
        expect(untukPenjual).toHaveLength(1);
        expect(untukPenjual[0]).toMatchObject({
          user_id: pembeli,
          peran: "pembeli",
          no_hp: "6281200000201",
        });
      } else {
        expect(untukPembeli).toHaveLength(0);
        expect(untukPenjual).toHaveLength(0);
      }
    }
  });

  it("kontak terbuka saat dikonfirmasi dan tertutup lagi setelah gagal panen", async () => {
    const listing = await db.buatListing(penjual);
    const order = await db.pesan(pembeli, listing, 10);
    expect(await kontak(pembeli, order)).toHaveLength(0);

    await db.ubahStatus(penjual, order, "dikonfirmasi");
    expect(await kontak(pembeli, order)).toHaveLength(1);

    await db.ubahStatus(penjual, order, "gagal_panen", "kemarau panjang");
    expect(await kontak(pembeli, order)).toHaveLength(0);
    expect(await kontak(penjual, order)).toHaveLength(0);
  });

  it("orang di luar pesanan tidak mendapat kontak siapa pun", async () => {
    const listing = await db.buatListing(penjual);
    const order = await pesananBerstatus(listing, "dikonfirmasi");
    expect(await kontak(pembeliLain, order)).toHaveLength(0);
    expect(await kontak(penjualLain, order)).toHaveLength(0);
    expect(await kontak(pembeliLain)).toHaveLength(0);
  });

  it("tanpa argumen mengembalikan semua pesanan saya yang kontaknya terbuka", async () => {
    const pembeliBaru = await db.buatPengguna({ peran: "pembeli", nama: "Rizky" });
    const listing = await db.buatListing(penjual);
    const terbuka: string[] = [];
    for (const status of ["dikonfirmasi", "dikirim", "menunggu", "ditolak"] as const) {
      const [baris] = await db.admin(
        `insert into public.orders (listing_id, pembeli_id, jumlah_kg, harga_per_kg, status)
         values ($1, $2, 5, 60000, $3) returning id`,
        [listing, pembeliBaru, status],
      );
      if (kontakTerbuka(status)) terbuka.push(String(baris.id));
    }
    const hasil = await kontak(pembeliBaru);
    expect(hasil.map((k) => k.order_id).sort()).toEqual(terbuka.sort());
  });

  it("tamu tidak bisa memanggil kontak_pesanan", async () => {
    const g = await galatDari(() => db.sebagaiTamu((q) => q("select * from public.kontak_pesanan()")));
    expect(g.code).toBe("42501");
  });
});

describe("batal otomatis setelah 48 jam", () => {
  it("membatalkan pesanan menunggu yang lewat 48 jam, mengembalikan stok, memberi tahu keduanya", async () => {
    const listing = await db.buatListing(penjual, { jumlah_kg: 100 });
    const lama = await db.pesan(pembeli, listing, 30);
    const baru = await db.pesan(pembeli, listing, 20);
    const dikonfirmasi = await db.pesan(pembeli, listing, 10);
    await db.ubahStatus(penjual, dikonfirmasi, "dikonfirmasi");
    await db.admin(
      "update public.orders set dibuat_pada = now() - interval '49 hours' where id = any($1::uuid[])",
      [[lama, dikonfirmasi]],
    );

    const [{ n }] = await db.sebagai(pembeliLain, (q) =>
      q("select public.batalkan_pesanan_kedaluwarsa() as n"),
    );
    expect(n).toBe(1);

    expect(await db.order(lama)).toMatchObject({ status: "dibatalkan" });
    expect((await db.order(lama)).alasan_batal).toContain("48 jam");
    expect((await db.order(baru)).status).toBe("menunggu");
    expect((await db.order(dikonfirmasi)).status).toBe("dikonfirmasi");
    expect(Number((await db.listing(listing)).sisa_kg)).toBe(70);

    for (const siapa of [pembeli, penjual]) {
      const n48 = (await db.notifikasi(siapa)).filter((x) => x.order_id === lama && String(x.pesan).includes("48 jam"));
      expect(n48).toHaveLength(1);
    }
  });

  it("tidak melakukan apa-apa jika tidak ada yang kedaluwarsa", async () => {
    const [{ n }] = await db.sebagai(pembeli, (q) => q("select public.batalkan_pesanan_kedaluwarsa() as n"));
    expect(n).toBe(0);
  });
});
