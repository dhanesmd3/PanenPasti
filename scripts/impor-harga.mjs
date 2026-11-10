// Impor data/harga/cabai_rawit_merah_pihps.csv ke tabel harga_historis.
//
//   npm run impor:harga
//
// Butuh di .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// Tabel: harga_historis(komoditas_id, tanggal, wilayah, tingkat, harga, sumber)
//        dengan unique (komoditas_id, tanggal, wilayah, tingkat).
// Aman dijalankan berulang (upsert).
//
// Catatan: API prediksi saat ini membaca CSV langsung (lib/data/statis.ts),
// jadi impor ini opsional, untuk kebutuhan query/grafik dari database.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Isi NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di .env.local");
  process.exit(1);
}
const db = createClient(url, serviceKey, { auth: { persistSession: false } });

const SUMBER = "PIHPS Nasional, Bank Indonesia";
const baris = readFileSync("data/harga/cabai_rawit_merah_pihps.csv", "utf-8").trim().split(/\r?\n/);
if (baris.shift() !== "tanggal,wilayah,tingkat,harga_per_kg") {
  console.error("Header CSV tidak dikenali");
  process.exit(1);
}
const data = baris.map((b) => {
  const [tanggal, wilayah, tingkat, harga] = b.split(",");
  return { komoditas_id: 1, tanggal, wilayah, tingkat, harga: Number(harga), sumber: SUMBER };
});

const UKURAN = 500;
for (let i = 0; i < data.length; i += UKURAN) {
  const { error } = await db
    .from("harga_historis")
    .upsert(data.slice(i, i + UKURAN), { onConflict: "komoditas_id,tanggal,wilayah,tingkat" });
  if (error) {
    console.error(`Gagal di baris ${i + 1}: ${error.message}`);
    process.exit(1);
  }
  console.log(`✓ ${Math.min(i + UKURAN, data.length)}/${data.length}`);
}
console.log("Selesai.");
