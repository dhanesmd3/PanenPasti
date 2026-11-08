import { z } from "zod";

// Properti JSON Schema yang diterima Gemini lewat `responseJsonSchema`
// (lihat dokumentasi GenerateContentConfig di @google/genai).
const DIDUKUNG = new Set([
  "$id",
  "$defs",
  "$ref",
  "$anchor",
  "type",
  "format",
  "title",
  "description",
  "enum",
  "items",
  "prefixItems",
  "minItems",
  "maxItems",
  "minimum",
  "maximum",
  "anyOf",
  "oneOf",
  "properties",
  "additionalProperties",
  "required",
]);

type Skema = { [k: string]: unknown };

function bersihkan(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(bersihkan);
  if (node === null || typeof node !== "object") return node;

  const asal = node as Skema;
  const hasil: Skema = {};

  // `type: ["string", "null"]` diubah ke anyOf, bentuk yang pasti didukung.
  if (Array.isArray(asal.type)) {
    const lain = Object.fromEntries(
      Object.entries(asal).filter(([k]) => k !== "type"),
    );
    return bersihkan({
      ...lain,
      anyOf: (asal.type as string[]).map((t) => ({ type: t })),
    });
  }

  for (const [k, v] of Object.entries(asal)) {
    if (!DIDUKUNG.has(k)) continue;
    if (k === "properties" || k === "$defs") {
      hasil[k] = Object.fromEntries(
        Object.entries(v as Skema).map(([nama, sub]) => [nama, bersihkan(sub)]),
      );
    } else {
      hasil[k] = bersihkan(v);
    }
  }
  return hasil;
}

/**
 * Ubah skema Zod menjadi JSON Schema yang aman dikirim ke LLM.
 * Batasan yang dibuang di sini (mis. `exclusiveMinimum`) tetap divalidasi
 * oleh Zod setelah jawaban diterima.
 */
export function keJsonSchema(skema: z.ZodType): Skema {
  return bersihkan(z.toJSONSchema(skema)) as Skema;
}
