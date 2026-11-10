import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  barisListing,
  barisOrder,
  barisPesananLengkap,
  buatSupabaseTiruan,
  ID,
  konteks,
  permintaan,
  type SupabaseTiruan,
} from "./bantuan";

const keadaan = vi.hoisted(() => ({
  terkonfigurasi: true,
  sesi: null as null | { supabase: unknown; userId: string; email: string | null },
}));

vi.mock("@/lib/supabase/server", () => ({
  supabaseTerkonfigurasi: () => keadaan.terkonfigurasi,
  sesiOpsional: async () => keadaan.sesi,
  buatSupabaseServer: async () => keadaan.sesi?.supabase,
  idPenggunaOpsional: async () => keadaan.sesi?.userId ?? null,
}));

import * as surplus from "@/app/api/listings/[id]/surplus/route";
import * as jumlahNotifikasi from "@/app/api/notifikasi/jumlah/route";
import * as notifikasi from "@/app/api/notifikasi/route";
import * as satuOrder from "@/app/api/orders/[id]/route";
import * as orders from "@/app/api/orders/route";

let sb: SupabaseTiruan;

function masukSebagai(userId: string) {
  keadaan.sesi = { supabase: sb.klien, userId, email: "uji@example.com" };
}

beforeEach(() => {
  sb = buatSupabaseTiruan();
  keadaan.terkonfigurasi = true;
  keadaan.sesi = null;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("semua endpoint: sesi", () => {
  const panggilan: [string, () => Promise<Response>][] = [
    ["POST /api/orders", () => orders.POST(permintaan("POST", "/api/orders", {}))],
    ["GET /api/orders", () => orders.GET(new NextRequest("http://localhost/api/orders"))],
    ["GET /api/orders/[id]", () => satuOrder.GET(permintaan("GET", "/x"), konteks(ID.order))],
    ["PATCH /api/orders/[id]", () => satuOrder.PATCH(permintaan("PATCH", "/x", {}), konteks(ID.order))],
    ["GET /api/notifikasi", () => notifikasi.GET(new NextRequest("http://localhost/api/notifikasi"))],
    ["PATCH /api/notifikasi", () => notifikasi.PATCH(permintaan("PATCH", "/x", {}))],
    ["GET /api/notifikasi/jumlah", () => jumlahNotifikasi.GET()],
    ["POST surplus", () => surplus.POST(permintaan("POST", "/x", {}), konteks(ID.listing))],
    ["DELETE surplus", () => surplus.DELETE(permintaan("DELETE", "/x"), konteks(ID.listing))],
  ];

  it.each(panggilan)("%s menjawab 401 tanpa login dan tidak menyentuh database", async (_nama, panggil) => {
    const r = await panggil();
    expect(r.status).toBe(401);
    expect(await r.json()).toEqual({ error: "Masuk terlebih dahulu." });
    expect(sb.rpc).not.toHaveBeenCalled();
    expect(sb.from).not.toHaveBeenCalled();
  });

  it.each(panggilan)("%s menjawab 503 jika Supabase belum dikonfigurasi", async (_nama, panggil) => {
    keadaan.terkonfigurasi = false;
    const r = await panggil();
    expect(r.status).toBe(503);
  });
});

describe("POST /api/orders", () => {
  beforeEach(() => masukSebagai(ID.pembeli));

  it("memanggil buat_pesanan dan menjawab 201 dengan Order", async () => {
    sb.jawabRpc("buat_pesanan", { data: { ...barisOrder(), jumlah_kg: "20.00" }, error: null });
    const r = await orders.POST(permintaan("POST", "/api/orders", { listing_id: ID.listing, jumlah_kg: 20 }));

    expect(r.status).toBe(201);
    expect(await r.json()).toEqual(barisOrder());
    expect(sb.rpc).toHaveBeenCalledWith("buat_pesanan", {
      p_listing_id: ID.listing,
      p_jumlah_kg: 20,
      p_kebutuhan_id: null,
    });
  });

  it("meneruskan kebutuhan_id", async () => {
    sb.jawabRpc("buat_pesanan", { data: barisOrder(), error: null });
    await orders.POST(
      permintaan("POST", "/api/orders", { listing_id: ID.listing, jumlah_kg: 5, kebutuhan_id: ID.notif }),
    );
    expect(sb.rpc).toHaveBeenCalledWith("buat_pesanan", expect.objectContaining({ p_kebutuhan_id: ID.notif }));
  });

  it.each([
    ["bukan json", "Body permintaan harus berupa JSON."],
    [{ listing_id: ID.listing, jumlah_kg: 0 }, "Jumlah pesanan harus lebih dari 0 kg."],
    [{ listing_id: "abc", jumlah_kg: 5 }, "ID tidak valid."],
    [{ listing_id: ID.listing, jumlah_kg: "5" }, "Jumlah pesanan harus berupa angka."],
  ])("body %j ditolak 400 sebelum sampai ke database", async (body, pesan) => {
    const r = await orders.POST(permintaan("POST", "/api/orders", body));
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ error: pesan });
    expect(sb.rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["PP409", 409, "Stok tidak cukup. Sisa stok 40 kg."],
    ["PP403", 403, "Hanya pembeli yang bisa membuat pesanan."],
    ["PP404", 404, "Panen tidak ditemukan."],
  ])("galat %s dari database menjadi HTTP %i dengan pesan aslinya", async (kode, status, pesan) => {
    sb.jawabRpc("buat_pesanan", { data: null, error: { code: kode, message: pesan } });
    const r = await orders.POST(permintaan("POST", "/api/orders", { listing_id: ID.listing, jumlah_kg: 60 }));
    expect(r.status).toBe(status);
    expect(await r.json()).toEqual({ error: pesan, kode });
  });
});

describe("GET /api/orders", () => {
  beforeEach(() => masukSebagai(ID.penjual));

  it("mengembalikan PesananLengkap dengan aksi sesuai peran, setelah membatalkan yang kedaluwarsa", async () => {
    sb.jawabTabel("orders", { data: [barisPesananLengkap("menunggu")], error: null });
    sb.jawabRpc("kontak_pesanan", { data: [], error: null });

    const r = await orders.GET(new NextRequest("http://localhost/api/orders"));
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toBe("no-store");

    const [p] = await r.json();
    expect(p).toMatchObject({
      id: ID.order,
      peran_saya: "penjual",
      aksi: ["dikonfirmasi", "ditolak"],
      kontak: null,
      total_harga: 1_240_000,
      listing: { id: ID.listing },
      pembeli: { nama: "Siti" },
    });
    expect(sb.rpc.mock.calls[0][0]).toBe("batalkan_pesanan_kedaluwarsa");
    expect(sb.kueriKe("orders")[0].argumen("limit")).toEqual([50]);
  });

  it("menyertakan kontak pembeli setelah dikonfirmasi", async () => {
    sb.jawabTabel("orders", { data: [barisPesananLengkap("dikonfirmasi")], error: null });
    sb.jawabRpc("kontak_pesanan", {
      data: [
        {
          order_id: ID.order,
          user_id: ID.pembeli,
          peran: "pembeli",
          nama: "Siti",
          nama_usaha: null,
          no_hp: "6281200000201",
        },
      ],
      error: null,
    });
    const [p] = await (await orders.GET(new NextRequest("http://localhost/api/orders"))).json();
    expect(p.kontak).toEqual({
      nama: "Siti",
      nama_usaha: null,
      no_hp: "6281200000201",
      wa_url: "https://wa.me/6281200000201",
    });
    expect(p.aksi).toEqual(["dikirim", "gagal_panen"]);
  });

  it("menerapkan filter status, listing_id, dan batas", async () => {
    await orders.GET(
      new NextRequest(`http://localhost/api/orders?status=menunggu,dikonfirmasi&listing_id=${ID.listing}&batas=500`),
    );
    const q = sb.kueriKe("orders")[0];
    expect(q.argumen("in")).toEqual(["status", ["menunggu", "dikonfirmasi"]]);
    expect(q.argumen("eq")).toEqual(["listing_id", ID.listing]);
    expect(q.argumen("limit")).toEqual([100]);
  });

  it.each(["?status=ngawur", "?status=menunggu,x", "?listing_id=abc"])("menolak %s dengan 400", async (qs) => {
    const r = await orders.GET(new NextRequest(`http://localhost/api/orders${qs}`));
    expect(r.status).toBe(400);
    expect(sb.from).not.toHaveBeenCalled();
  });

  it("tetap menjawab walau pembatalan otomatis gagal", async () => {
    sb.jawabRpc("batalkan_pesanan_kedaluwarsa", { data: null, error: { code: "XX000", message: "rusak" } });
    sb.jawabRpc("kontak_pesanan", { data: [], error: null });
    const r = await orders.GET(new NextRequest("http://localhost/api/orders"));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual([]);
  });

  it("galat database menjadi 500 tanpa membocorkan detail", async () => {
    sb.jawabTabel("orders", { data: null, error: { code: "XX000", message: "detail internal" } });
    const r = await orders.GET(new NextRequest("http://localhost/api/orders"));
    expect(r.status).toBe(500);
    expect((await r.json()).error).not.toContain("internal");
  });
});

describe("GET dan PATCH /api/orders/[id]", () => {
  beforeEach(() => masukSebagai(ID.penjual));

  it("GET mengembalikan satu pesanan", async () => {
    sb.jawabTabel("orders", { data: barisPesananLengkap("menunggu"), error: null });
    sb.jawabRpc("kontak_pesanan", { data: [], error: null });
    const r = await satuOrder.GET(permintaan("GET", "/x"), konteks(ID.order));
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ id: ID.order, peran_saya: "penjual" });
    expect(sb.rpc).toHaveBeenCalledWith("kontak_pesanan", { p_order_id: ID.order });
  });

  it("GET menjawab 404 untuk pesanan yang tidak ada atau disembunyikan RLS", async () => {
    sb.jawabTabel("orders", { data: null, error: null });
    sb.jawabRpc("kontak_pesanan", { data: [], error: null });
    const r = await satuOrder.GET(permintaan("GET", "/x"), konteks(ID.order));
    expect(r.status).toBe(404);
  });

  it("id yang bukan UUID dijawab 404 tanpa menyentuh database", async () => {
    for (const panggil of [
      () => satuOrder.GET(permintaan("GET", "/x"), konteks("abc")),
      () => satuOrder.PATCH(permintaan("PATCH", "/x", { status: "dikonfirmasi" }), konteks("abc")),
    ]) {
      const r = await panggil();
      expect(r.status).toBe(404);
    }
    expect(sb.rpc).not.toHaveBeenCalled();
    expect(sb.from).not.toHaveBeenCalled();
  });

  it("PATCH memanggil ubah_status dan mengembalikan Order", async () => {
    sb.jawabRpc("ubah_status", { data: barisOrder("dikonfirmasi"), error: null });
    const r = await satuOrder.PATCH(permintaan("PATCH", "/x", { status: "dikonfirmasi" }), konteks(ID.order));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual(barisOrder("dikonfirmasi"));
    expect(sb.rpc).toHaveBeenCalledWith("ubah_status", {
      p_order_id: ID.order,
      p_status_baru: "dikonfirmasi",
      p_alasan: null,
    });
    expect(sb.rpc.mock.calls.map((c) => c[0])).toEqual(["batalkan_pesanan_kedaluwarsa", "ubah_status"]);
  });

  it("PATCH meneruskan alasan yang sudah dirapikan", async () => {
    sb.jawabRpc("ubah_status", { data: barisOrder("gagal_panen"), error: null });
    await satuOrder.PATCH(
      permintaan("PATCH", "/x", { status: "gagal_panen", alasan: "  tanaman terserang patek " }),
      konteks(ID.order),
    );
    expect(sb.rpc).toHaveBeenCalledWith(
      "ubah_status",
      expect.objectContaining({ p_status_baru: "gagal_panen", p_alasan: "tanaman terserang patek" }),
    );
  });

  it.each([
    [{ status: "gagal_panen" }, "Tulis alasan gagal panen supaya pembeli tahu penyebabnya."],
    [{ status: "menunggu" }, "Status pesanan tidak dikenal."],
    [{}, "Status pesanan tidak dikenal."],
  ])("PATCH dengan body %j ditolak 400", async (body, pesan) => {
    const r = await satuOrder.PATCH(permintaan("PATCH", "/x", body), konteks(ID.order));
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ error: pesan });
    expect(sb.rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["PP403", 403],
    ["PP404", 404],
    ["PP409", 409],
    ["PP422", 422],
  ])("PATCH: galat %s menjadi HTTP %i", async (kode, status) => {
    sb.jawabRpc("ubah_status", { data: null, error: { code: kode, message: "Pesan dari database." } });
    const r = await satuOrder.PATCH(permintaan("PATCH", "/x", { status: "dikirim" }), konteks(ID.order));
    expect(r.status).toBe(status);
    expect(await r.json()).toEqual({ error: "Pesan dari database.", kode });
  });
});

describe("notifikasi", () => {
  const daftar = [
    {
      id: ID.notif,
      user_id: ID.pembeli,
      tipe: "surplus",
      pesan: "Panen surplus dari Gapoktan Lembur Subur",
      order_id: null,
      listing_id: ID.listing,
      dibaca: false,
      dibuat_pada: "2026-11-10T03:00:00+00:00",
    },
  ];

  beforeEach(() => masukSebagai(ID.pembeli));

  it("GET mengembalikan daftar milik pengguna dan jumlah belum dibaca di header", async () => {
    sb.jawabTabel("notifikasi", { data: daftar, error: null });
    sb.jawabTabel("notifikasi", { data: null, error: null, count: 3 });

    const r = await notifikasi.GET(new NextRequest("http://localhost/api/notifikasi"));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual(daftar);
    expect(r.headers.get("x-belum-dibaca")).toBe("3");

    const [ambil, hitung] = sb.kueriKe("notifikasi");
    expect(ambil.panggilan.filter(([m]) => m === "eq")).toEqual([["eq", ["user_id", ID.pembeli]]]);
    expect(ambil.argumen("limit")).toEqual([50]);
    expect(hitung.argumen("select")).toEqual(["id", { count: "exact", head: true }]);
  });

  it("GET ?belum_dibaca=1 hanya mengambil yang belum dibaca", async () => {
    await notifikasi.GET(new NextRequest("http://localhost/api/notifikasi?belum_dibaca=1&batas=5"));
    const [ambil] = sb.kueriKe("notifikasi");
    expect(ambil.panggilan.filter(([m]) => m === "eq")).toContainEqual(["eq", ["dibaca", false]]);
    expect(ambil.argumen("limit")).toEqual([5]);
  });

  it("GET /jumlah mengembalikan jumlah belum dibaca", async () => {
    sb.jawabTabel("notifikasi", { data: null, error: null, count: 7 });
    const r = await jumlahNotifikasi.GET();
    expect(await r.json()).toEqual({ belum_dibaca: 7 });
  });

  it("PATCH dengan ids hanya menandai notifikasi itu, dan hanya milik pengguna", async () => {
    sb.jawabTabel("notifikasi", { data: [{ id: ID.notif }], error: null });
    sb.jawabTabel("notifikasi", { data: null, error: null, count: 2 });

    const r = await notifikasi.PATCH(permintaan("PATCH", "/x", { ids: [ID.notif] }));
    expect(await r.json()).toEqual({ diperbarui: 1, belum_dibaca: 2 });

    const [ubah] = sb.kueriKe("notifikasi");
    expect(ubah.argumen("update")).toEqual([{ dibaca: true }]);
    expect(ubah.panggilan).toContainEqual(["eq", ["user_id", ID.pembeli]]);
    expect(ubah.argumen("in")).toEqual(["id", [ID.notif]]);
  });

  it("PATCH tanpa ids menandai semua", async () => {
    sb.jawabTabel("notifikasi", { data: [{ id: "a" }, { id: "b" }], error: null });
    sb.jawabTabel("notifikasi", { data: null, error: null, count: 0 });
    const r = await notifikasi.PATCH(permintaan("PATCH", "/x", {}));
    expect(await r.json()).toEqual({ diperbarui: 2, belum_dibaca: 0 });
    expect(sb.kueriKe("notifikasi")[0].punya("in")).toBe(false);
  });

  it("PATCH menolak ids yang rusak", async () => {
    const r = await notifikasi.PATCH(permintaan("PATCH", "/x", { ids: ["bukan-uuid"] }));
    expect(r.status).toBe(400);
    expect(sb.from).not.toHaveBeenCalled();
  });
});

describe("surplus", () => {
  beforeEach(() => masukSebagai(ID.penjual));

  it("POST memanggil tandai_surplus dan mengembalikan Listing", async () => {
    sb.jawabRpc("tandai_surplus", {
      data: barisListing({ is_surplus: true, harga_surplus: 52000, sisa_kg: "480.00" }),
      error: null,
    });
    const r = await surplus.POST(permintaan("POST", "/x", { harga_surplus: 52000 }), konteks(ID.listing));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual(barisListing({ is_surplus: true, harga_surplus: 52000 }));
    expect(sb.rpc).toHaveBeenCalledWith("tandai_surplus", { p_listing_id: ID.listing, p_harga_surplus: 52000 });
  });

  it.each([
    [{}, "Harga surplus harus berupa angka."],
    [{ harga_surplus: 50.5 }, "Harga surplus harus bilangan bulat (rupiah)."],
    [{ harga_surplus: 10 }, "Harga surplus paling rendah Rp100/kg."],
  ])("POST dengan body %j ditolak 400", async (body, pesan) => {
    const r = await surplus.POST(permintaan("POST", "/x", body), konteks(ID.listing));
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ error: pesan });
    expect(sb.rpc).not.toHaveBeenCalled();
  });

  it("POST: listing orang lain dijawab 404, harga terlalu tinggi 422", async () => {
    sb.jawabRpc("tandai_surplus", { data: null, error: { code: "PP404", message: "Panen tidak ditemukan." } });
    let r = await surplus.POST(permintaan("POST", "/x", { harga_surplus: 52000 }), konteks(ID.listing));
    expect(r.status).toBe(404);

    sb.jawabRpc("tandai_surplus", {
      data: null,
      error: { code: "PP422", message: "Harga surplus harus lebih rendah dari harga normal (Rp56.000/kg)." },
    });
    r = await surplus.POST(permintaan("POST", "/x", { harga_surplus: 60000 }), konteks(ID.listing));
    expect(r.status).toBe(422);
    expect((await r.json()).error).toContain("Rp56.000/kg");
  });

  it("DELETE memanggil batal_surplus", async () => {
    sb.jawabRpc("batal_surplus", { data: barisListing(), error: null });
    const r = await surplus.DELETE(permintaan("DELETE", "/x"), konteks(ID.listing));
    expect(r.status).toBe(200);
    expect((await r.json()).is_surplus).toBe(false);
    expect(sb.rpc).toHaveBeenCalledWith("batal_surplus", { p_listing_id: ID.listing });
  });

  it("id listing yang bukan UUID dijawab 404", async () => {
    const r = await surplus.POST(permintaan("POST", "/x", { harga_surplus: 52000 }), konteks("1"));
    expect(r.status).toBe(404);
    expect(sb.rpc).not.toHaveBeenCalled();
  });
});
