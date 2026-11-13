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

const BATAS_WAKTU_MS = 30_000;

/** Buang pagar ```json ... ``` yang kadang ditambahkan model. */
function bersihkanPagarJson(teks: string): string {
  const cocok = teks.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return cocok ? cocok[1] : teks;
}

// OpenRouter memakai format chat completions ala OpenAI.
// https://openrouter.ai/docs/api-reference/overview
function buatOpenRouter(): ProviderAI {
  const model = wajibEnv("OPENROUTER_MODEL");
  const apiKey = wajibEnv("OPENROUTER_API_KEY");

  return {
    nama: "openrouter",
    model,
    async hasilkanTeks({ sistem, prompt, jsonSchema, temperature = 0.2 }) {
      let res: Response;
      try {
        res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            temperature,
            messages: [
              {
                role: "system",
                content: jsonSchema
                  ? `${sistem}\n\nJawab HANYA dengan JSON yang sesuai skema ini, tanpa teks lain:\n${JSON.stringify(jsonSchema)}`
                  : sistem,
              },
              { role: "user", content: prompt },
            ],
            ...(jsonSchema
              ? {
                  response_format: {
                    type: "json_schema",
                    json_schema: { name: "hasil", strict: false, schema: jsonSchema },
                  },
                }
              : {}),
          }),
          signal: AbortSignal.timeout(BATAS_WAKTU_MS),
        });
      } catch (e) {
        const habisWaktu = (e as Error).name === "TimeoutError";
        throw new GalatAI(
          "layanan",
          habisWaktu
            ? `OpenRouter tidak menjawab dalam ${BATAS_WAKTU_MS / 1000} detik`
            : (e as Error).message,
        );
      }

      const body = (await res.json().catch(() => null)) as {
        error?: { message?: string };
        choices?: { message?: { content?: string | null } }[];
      } | null;

      if (!res.ok || body?.error) {
        const status = res.ok ? undefined : res.status;
        throw new GalatAI(
          status === 429 || status === 402 ? "kuota" : "layanan",
          body?.error?.message ?? `OpenRouter HTTP ${res.status}`,
          status,
        );
      }

      const teks = body?.choices?.[0]?.message?.content;
      if (!teks) throw new GalatAI("output", "Jawaban AI kosong");
      return jsonSchema ? bersihkanPagarJson(teks) : teks;
    },
  };
}

/** Provider sesuai env AI_PROVIDER. Cadangan (groq, anthropic) menyusul. */
export function ambilProviderAI(): ProviderAI {
  const pilihan = process.env.AI_PROVIDER ?? "gemini";
  switch (pilihan) {
    case "gemini":
      return buatGemini();
    case "openrouter":
      return buatOpenRouter();
    default:
      throw new GalatAI(
        "konfigurasi",
        `AI_PROVIDER "${pilihan}" belum didukung. Pilihan saat ini: gemini, openrouter`,
      );
  }
}
