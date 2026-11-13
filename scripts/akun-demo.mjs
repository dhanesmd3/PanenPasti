// Membuat (atau memperbaiki) dua akun demo: satu penjual, satu pembeli.
//
//   npm run akun:demo
//
// Butuh di .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// Opsional: DEMO_PASSWORD. Isi nilai yang sama di server (.env.local / Vercel)
// supaya tombol "Coba akun demo" di halaman Masuk aktif.
//
// Berbeda dengan `npm run seed`, skrip ini tidak menyentuh listing atau akun
// simulasi lain. Aman dijalankan berulang: akun yang sudah ada disetel ulang
// kata sandinya, dikonfirmasi emailnya, dan profilnya dilengkapi.

import { readFileSync } from "node:fs";
import {
  buatKlienAdmin,
  cekDatabase,
  EMAIL_DEMO,
  PASSWORD_DEMO,
  pastikanAkun,
  simpanProfil,
} from "./akun.mjs";

const sim = JSON.parse(readFileSync("data/seed/simulasi.json", "utf-8"));
const PERSONA = {
  penjual: sim.penjual.find((p) => p.kunci === "pj1"),
  pembeli: sim.pembeli.find((p) => p.kunci === "pb1"),
};

const db = buatKlienAdmin();
await cekDatabase(db);

for (const peran of ["penjual", "pembeli"]) {
  const orang = PERSONA[peran];
  const email = EMAIL_DEMO[peran];
  const { id, baru } = await pastikanAkun(db, { email, password: PASSWORD_DEMO, peran, nama: orang.nama });
  await simpanProfil(db, id, { peran, ...orang });
  console.log(`✓ ${peran.padEnd(7)} ${email} (${baru ? "dibuat" : "diperbarui"})`);
}

console.log(`\nKata sandi: ${process.env.DEMO_PASSWORD || process.env.SEED_PASSWORD ? "sesuai DEMO_PASSWORD" : PASSWORD_DEMO}`);
if (!process.env.DEMO_PASSWORD) {
  console.log("Tombol akun demo di halaman Masuk aktif kalau DEMO_PASSWORD diisi di server.");
}
console.log("Listing simulasi untuk katalog: npm run seed");
