// Adapter LLM. Hanya boleh diimpor dari kode server (route handler),
// karena membaca API key dari environment.
//
// Ganti provider cukup lewat env AI_PROVIDER, tanpa mengubah fitur.
// Lihat docs/PRD bagian 8.

import { ApiError, GoogleGenAI } from "@google/genai";

export type JenisGalatAI =
  | "konfigurasi" // env belum diisi / provider belum didukung
  | "kuota" // rate limit atau kuota habis (HTTP 429)
  | "layanan" // error dari provider (5xx, jaringan)
  | "output"; // jawaban tidak sesuai skema

export class GalatAI extends Error {
  constructor(
    public jenis: JenisGalatAI,
    pesan: string,
    public status?: number,
  ) {
    super(pesan);
    this.name = "GalatAI";
  }
}

export interface PermintaanAI {
  /** Instruksi sistem: peran, aturan, format. */
  sistem: string;
  /** Isi permintaan dari pengguna atau data yang diolah. */
  prompt: string;
  /** Jika diisi, provider diminta menjawab JSON sesuai skema ini. */
  jsonSchema?: Record<string, unknown>;
  /** Default 0.2: jawaban konsisten untuk ekstraksi data. */
  temperature?: number;
}

export interface ProviderAI {
  nama: string;
  model: string;
  hasilkanTeks(permintaan: PermintaanAI): Promise<string>;
}

function wajibEnv(nama: string): string {
  const nilai = process.env[nama];
  if (!nilai) {
    throw new GalatAI("konfigurasi", `Environment ${nama} belum diisi`);
  }
  return nilai;
}

function buatGemini(): ProviderAI {
  const model = wajibEnv("GEMINI_MODEL");
  const ai = new GoogleGenAI({ apiKey: wajibEnv("GEMINI_API_KEY") });

  return {
    nama: "gemini",
    model,
    async hasilkanTeks({ sistem, prompt, jsonSchema, temperature = 0.2 }) {
      try {
        const res = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction: sistem,
            temperature,
            ...(jsonSchema
              ? {
                  responseMimeType: "application/json",
                  responseJsonSchema: jsonSchema,
                }
              : {}),
          },
        });
        const teks = res.text;
        if (!teks) throw new GalatAI("output", "Jawaban AI kosong");
        return teks;
      } catch (e) {
        if (e instanceof GalatAI) throw e;
        if (e instanceof ApiError) {
          throw new GalatAI(
            e.status === 429 ? "kuota" : "layanan",
            e.message,
            e.status,
          );
        }
        throw new GalatAI("layanan", (e as Error).message);
      }
    },
  };
}

/** Provider sesuai env AI_PROVIDER. Cadangan (groq, anthropic) menyusul. */
export function ambilProviderAI(): ProviderAI {
  const pilihan = process.env.AI_PROVIDER ?? "gemini";
  switch (pilihan) {
    case "gemini":
      return buatGemini();
    default:
      throw new GalatAI(
        "konfigurasi",
        `AI_PROVIDER "${pilihan}" belum didukung. Pilihan saat ini: gemini`,
      );
  }
}
