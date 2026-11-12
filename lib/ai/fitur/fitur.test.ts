import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { bacaCsvHarga } from "../../harga-csv";
import { susunPrediksi } from "../../harga-prediksi";
import { GalatAI, type PermintaanAI, type ProviderAI } from "../provider";
import { ekstrakKebutuhan, hariBerikutnya } from "./kebutuhan";
import { ekstrakListing } from "./listing";
import { angkaSesuaiFakta, faktaDari, jelaskanHarga, teksTemplate } from "./penjelasan-harga";

const HARI_INI = "2026-11-10"; // Selasa

function palsu(jawaban: unknown | (() => never)) {
  const diterima: PermintaanAI[] = [];
  const provider: ProviderAI = {
    nama: "palsu",
    model: "palsu-1",
    async hasilkanTeks(p) {
      diterima.push(p);
      if (typeof jawaban === "function") return (jawaban as () => never)();
      return JSON.stringify(jawaban);
    },
  };
  return { provider, diterima };
}

describe("AI-1 ekstrakKebutuhan", () => {
  it("mengunci nama komoditas dan meneruskan data yang valid", async () => {
    const { provider, diterima } = palsu({
      komoditas: "cabai_rawit_merah",
      jumlah_kg: 20,
      tgl_butuh: "2026-11-16",
      berulang: "mingguan:senin",
    });
    const h = await ekstrakKebutuhan("butuh 20 kg cengek tiap senin", HARI_INI, provider);
    expect(h).toEqual({
      ok: true,
      data: {
        komoditas_id: 1,
        komoditas: "Cabai Rawit Merah",
        jumlah_kg: 20,
        tgl_butuh: "2026-11-16",
        berulang: "mingguan:senin",
      },
    });
    expect(diterima[0].prompt).toContain("Hari ini: Selasa, 10 November 2026");
    expect(diterima[0].prompt).toContain('"""butuh 20 kg cengek tiap senin"""');
  });

  it("menolak komoditas di luar daftar", async () => {
    const { provider } = palsu({ komoditas: "lainnya", jumlah_kg: 5, tgl_butuh: null, berulang: null });
    expect(await ekstrakKebutuhan("bawang putih 5 kg", HARI_INI, provider)).toEqual({
      ok: false,
      alasan: "komoditas_tidak_didukung",
    });
  });

  it("memetakan komoditas lain di daftar ke id-nya", async () => {
    const { provider, diterima } = palsu({ komoditas: "tomat", jumlah_kg: 30, tgl_butuh: null, berulang: null });
    const h = await ekstrakKebutuhan("tomat 30 kg", HARI_INI, provider);
    expect(h).toEqual({
      ok: true,
      data: { komoditas_id: 3, komoditas: "Tomat", jumlah_kg: 30, tgl_butuh: null, berulang: null },
    });
    // Prompt memuat semua kode komoditas supaya AI bisa memilih.
    expect(diterima[0].sistem).toContain('"kubis" untuk kubis, kol, engkol');
  });

  it("menolak kode komoditas yang tidak dikenal", async () => {
    const { provider } = palsu({ komoditas: "durian", jumlah_kg: 5, tgl_butuh: null, berulang: null });
    await expect(ekstrakKebutuhan("durian 5 kg", HARI_INI, provider)).rejects.toThrow();
  });

  it("membuang tanggal di masa lalu dan jumlah tidak wajar", async () => {
    const { provider } = palsu({
      komoditas: "cabai_rawit_merah",
      jumlah_kg: 0,
      tgl_butuh: "2026-11-01",
      berulang: null,
    });
    const h = await ekstrakKebutuhan("cabai", HARI_INI, provider);
    expect(h.ok && h.data.jumlah_kg).toBeNull();
    expect(h.ok && h.data.tgl_butuh).toBeNull();
  });

  it("mengisi tanggal mulai dari hari berulang jika AI tidak mengisinya", async () => {
    const { provider } = palsu({
      komoditas: "cabai_rawit_merah",
      jumlah_kg: 10,
      tgl_butuh: null,
      berulang: "mingguan:kamis",
    });
    const h = await ekstrakKebutuhan("10 kg tiap kamis", HARI_INI, provider);
    expect(h.ok && h.data.tgl_butuh).toBe("2026-11-12");
  });

  it("hariBerikutnya tidak memilih hari ini", () => {
    expect(hariBerikutnya(HARI_INI, "mingguan:selasa")).toBe("2026-11-17");
    expect(hariBerikutnya(HARI_INI, "mingguan:rabu")).toBe("2026-11-11");
  });
});

describe("AI-2 ekstrakListing", () => {
  it("membulatkan harga dan membuang harga yang tidak wajar", async () => {
    const ok = palsu({
      komoditas: "cabai_rawit_merah",
      jumlah_kg: 500,
      tgl_panen: "2026-11-30",
      kualitas: "Super",
      harga_per_kg: 35040,
    });
    const h = await ekstrakListing("5 kuintal akhir bulan bagus 35 ribu", HARI_INI, ok.provider);
    expect(h).toEqual({
      ok: true,
      data: {
        komoditas_id: 1,
        komoditas: "Cabai Rawit Merah",
        jumlah_kg: 500,
        tgl_panen: "2026-11-30",
        kualitas: "Super",
        harga_per_kg: 35000,
      },
    });

    const aneh = palsu({
      komoditas: "cabai_rawit_merah",
      jumlah_kg: 500,
      tgl_panen: null,
      kualitas: null,
      harga_per_kg: 35,
    });
    const h2 = await ekstrakListing("5 kuintal harga 35", HARI_INI, aneh.provider);
    expect(h2.ok && h2.data.harga_per_kg).toBeNull();
  });

  it("memakai rentang harga per komoditas", async () => {
    // Rp4.000/kg wajar untuk kubis, tidak wajar untuk cabai rawit.
    const kubis = palsu({ komoditas: "kubis", jumlah_kg: 1000, tgl_panen: null, kualitas: null, harga_per_kg: 4000 });
    const h = await ekstrakListing("kol 1 ton 4 ribu", HARI_INI, kubis.provider);
    expect(h.ok && h.data).toMatchObject({ komoditas_id: 5, komoditas: "Kubis", harga_per_kg: 4000 });

    const cabai = palsu({ komoditas: "cabai_rawit_merah", jumlah_kg: 100, tgl_panen: null, kualitas: null, harga_per_kg: 4000 });
    const h2 = await ekstrakListing("rawit 1 kuintal 4 ribu", HARI_INI, cabai.provider);
    expect(h2.ok && h2.data.harga_per_kg).toBeNull();
  });
});

describe("AI-3 jelaskanHarga", () => {
  const data = bacaCsvHarga(readFileSync("data/harga/cabai_rawit_merah_pihps.csv", "utf-8"));
  const prediksi = susunPrediksi(data, "uji");
  const f = faktaDari(prediksi);

  it("template hanya memakai angka dari fakta", () => {
    expect(angkaSesuaiFakta(teksTemplate(f), f)).toBe(true);
  });

  it("penjaga angka menolak harga atau persen karangan", () => {
    expect(angkaSesuaiFakta(`Harga sekitar ${f.perkiraan}/kg.`, f)).toBe(true);
    expect(angkaSesuaiFakta("Harga bisa Rp999.000/kg.", f)).toBe(false);
    expect(angkaSesuaiFakta("Harga naik 87%.", f)).toBe(false);
    expect(angkaSesuaiFakta("Harga sekitar 60 ribu.", f)).toBe(false);
  });

  it("memakai teks AI jika angkanya sesuai", async () => {
    const teks = `Bapak/Ibu, perkiraan harga di minggu panen sekitar ${f.perkiraan}/kg.`;
    const h = await jelaskanHarga(prediksi, palsu({ teks }).provider);
    expect(h).toEqual({ teks, dibuat_ai: true });
  });

  it("jatuh ke template jika AI mengarang angka", async () => {
    const h = await jelaskanHarga(prediksi, palsu({ teks: "Bapak/Ibu, harga pasti Rp150.000/kg minggu depan." }).provider);
    expect(h).toEqual({ teks: teksTemplate(f), dibuat_ai: false });
  });

  it("jatuh ke template jika kuota AI habis", async () => {
    const habis = palsu(() => {
      throw new GalatAI("kuota", "429");
    });
    const h = await jelaskanHarga(prediksi, habis.provider);
    expect(h.dibuat_ai).toBe(false);
  });
});
