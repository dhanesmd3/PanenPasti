// Mengisi database dengan DATA SIMULASI untuk demo (data/seed/simulasi.json).
//
//   npm run seed
//
// Butuh di .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// Opsional: DEMO_PASSWORD (password semua akun simulasi; SEED_PASSWORD lama masih dibaca).
//
// Aman dijalankan berulang: akun yang sudah ada dipakai ulang (kata sandinya
// disetel ulang dan emailnya dikonfirmasi), profil di-upsert,
// listing milik penjual simulasi diganti baru dengan tanggal panen relatif hari ini.
// Asumsi skema: docs/PRD bagian 11 (tabel komoditas, kecamatan, profiles, listings).

import { readFileSync } from "node:fs";
import {
  buatKlienAdmin,
  cekDatabase,
  EMAIL_DEMO,
  keluarGagal,
  PASSWORD_DEMO,
  pastikanAkun,
  simpanProfil,
} from "./akun.mjs";

const db = buatKlienAdmin();
await cekDatabase(db);

const sim = JSON.parse(readFileSync("data/seed/simulasi.json", "utf-8"));
const kecamatan = readFileSync("data/kecamatan.csv", "utf-8")
  .trim()
  .split(/\r?\n/)
  .slice(1)
  .map((b) => {
    const [id, nama, kab_kota, lat, lng] = b.split(",");
    return { id: Number(id), nama, kab_kota, lat: Number(lat), lng: Number(lng) };
  });

const hariIni = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
const tambahHari = (t, n) => {
  const d = new Date(`${t}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const emailUntuk = (kunci) =>
  kunci === "pj1" ? EMAIL_DEMO.penjual
  : kunci === "pb1" ? EMAIL_DEMO.pembeli
  : `${kunci}.simulasi@example.com`;

function cek(error, langkah) {
  if (error) keluarGagal(`Gagal ${langkah}: ${error.message}`);
}

console.log(`Seed DATA SIMULASI, hari ini ${hariIni}\n`);

cek((await db.from("komoditas").upsert(sim.komoditas)).error, "upsert komoditas");
cek((await db.from("kecamatan").upsert(kecamatan)).error, "upsert kecamatan");
console.log(`✓ ${sim.komoditas.length} komoditas, ${kecamatan.length} kecamatan`);

const akun = [];
for (const [daftar, peran] of [[sim.penjual, "penjual"], [sim.pembeli, "pembeli"]]) {
  for (const orang of daftar) {
    const email = emailUntuk(orang.kunci);
    const { id } = await pastikanAkun(db, { email, password: PASSWORD_DEMO, peran, nama: orang.nama });
    await simpanProfil(db, id, { peran, ...orang });
    akun.push({ kunci: orang.kunci, id, email, peran, orang });
  }
}
console.log(`✓ ${akun.length} akun & profil`);

const penjual = akun.filter((a) => a.peran === "penjual");
cek(
  (await db.from("listings").delete().in("penjual_id", penjual.map((p) => p.id))).error,
  "menghapus listing simulasi lama",
);
const listings = penjual.flatMap(({ id, orang }) =>
  orang.listing.map((l) => ({
    penjual_id: id,
    komoditas_id: 1,
    jumlah_kg: l.jumlah_kg,
    sisa_kg: l.jumlah_kg,
    kualitas: l.kualitas,
    tgl_panen: tambahHari(hariIni, l.panen_dalam_hari),
    harga_per_kg: l.harga_per_kg,
    status: l.status,
    is_surplus: l.is_surplus ?? false,
    harga_surplus: l.harga_surplus ?? null,
  })),
);
cek((await db.from("listings").insert(listings)).error, "insert listing");
console.log(`✓ ${listings.length} listing (tanggal panen relatif dari ${hariIni})`);

const dariEnv = process.env.DEMO_PASSWORD || process.env.SEED_PASSWORD;
console.log(`\nAkun demo (password: ${dariEnv ? "sesuai DEMO_PASSWORD" : PASSWORD_DEMO}):`);
console.log(`  Penjual: ${EMAIL_DEMO.penjual}`);
console.log(`  Pembeli: ${EMAIL_DEMO.pembeli}`);
