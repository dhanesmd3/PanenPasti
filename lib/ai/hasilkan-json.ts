import { z } from "zod";
import { keJsonSchema } from "./json-schema";
import {
  ambilProviderAI,
  GalatAI,
  type PermintaanAI,
  type ProviderAI,
} from "./provider";

/**
 * Minta jawaban JSON dari LLM lalu validasi dengan Zod.
 * Gagal validasi → GalatAI("output"), supaya route bisa memakai fallback
 * (form manual) alih-alih menampilkan data yang salah.
 */
export async function hasilkanJson<T>(
  skema: z.ZodType<T>,
  permintaan: Omit<PermintaanAI, "jsonSchema">,
  provider: ProviderAI = ambilProviderAI(),
): Promise<T> {
  const teks = await provider.hasilkanTeks({
    ...permintaan,
    jsonSchema: keJsonSchema(skema),
  });

  let data: unknown;
  try {
    data = JSON.parse(teks);
  } catch {
    throw new GalatAI("output", "Jawaban AI bukan JSON yang valid");
  }

  const hasil = skema.safeParse(data);
  if (!hasil.success) {
    throw new GalatAI(
      "output",
      `Jawaban AI tidak sesuai skema: ${z.prettifyError(hasil.error)}`,
    );
  }
  return hasil.data;
}
