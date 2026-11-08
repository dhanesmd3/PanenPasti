import { describe, expect, it } from "vitest";
import { z } from "zod";
import { hasilkanJson } from "./hasilkan-json";
import { keJsonSchema } from "./json-schema";
import { GalatAI, type PermintaanAI, type ProviderAI } from "./provider";

const Skema = z.object({
  komoditas: z.string(),
  jumlah_kg: z.number().positive(),
  berulang: z.string().nullable(),
});

function providerPalsu(jawaban: string) {
  const diterima: PermintaanAI[] = [];
  const provider: ProviderAI = {
    nama: "palsu",
    model: "palsu-1",
    async hasilkanTeks(p) {
      diterima.push(p);
      return jawaban;
    },
  };
  return { provider, diterima };
}

describe("keJsonSchema", () => {
  it("membuang properti yang tidak didukung LLM", () => {
    const s = keJsonSchema(Skema) as Record<string, unknown>;
    const teks = JSON.stringify(s);
    expect(s).not.toHaveProperty("$schema");
    expect(teks).not.toContain("exclusiveMinimum");
    expect(s.required).toEqual(["komoditas", "jumlah_kg", "berulang"]);
  });

  it("mengubah tipe nullable menjadi anyOf", () => {
    const s = keJsonSchema(Skema) as {
      properties: Record<string, unknown>;
    };
    expect(s.properties.berulang).toEqual({
      anyOf: [{ type: "string" }, { type: "null" }],
    });
  });
});

describe("hasilkanJson", () => {
  it("mengembalikan data valid dan mengirim JSON schema ke provider", async () => {
    const { provider, diterima } = providerPalsu(
      '{"komoditas":"cabai rawit merah","jumlah_kg":20,"berulang":"mingguan:senin"}',
    );
    const hasil = await hasilkanJson(Skema, { sistem: "s", prompt: "p" }, provider);
    expect(hasil).toEqual({
      komoditas: "cabai rawit merah",
      jumlah_kg: 20,
      berulang: "mingguan:senin",
    });
    expect(diterima[0].jsonSchema).toBeDefined();
  });

  it("menolak jawaban yang bukan JSON", async () => {
    const { provider } = providerPalsu("maaf, saya tidak paham");
    await expect(
      hasilkanJson(Skema, { sistem: "s", prompt: "p" }, provider),
    ).rejects.toMatchObject({ name: "GalatAI", jenis: "output" });
  });

  it("menolak JSON yang melanggar skema (jumlah negatif)", async () => {
    const { provider } = providerPalsu(
      '{"komoditas":"cabai","jumlah_kg":-5,"berulang":null}',
    );
    const janji = hasilkanJson(Skema, { sistem: "s", prompt: "p" }, provider);
    await expect(janji).rejects.toBeInstanceOf(GalatAI);
    await expect(janji).rejects.toMatchObject({ jenis: "output" });
  });
});
