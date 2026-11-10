// Mengisi database dengan DATA SIMULASI untuk demo (data/seed/simulasi.json).
//
//   npm run seed
//
// Butuh di .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// Opsional: SEED_PASSWORD (password semua akun simulasi).
//
// Aman dijalankan berulang: akun yang sudah ada dipakai ulang, profil di-upsert,
// listing milik penjual simulasi diganti baru dengan tanggal panen relatif hari ini.
// Asumsi skema: docs/PRD bagian 11 (tabel komoditas, kecamatan, profiles, listings).

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Isi NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di .env.local");
  process.exit(1);
}
const PASSWORD = process.env.SEED_PASSWORD || "PanenPasti-Demo-2026";
const db = createClient(url, serviceKey, { auth: { persistSession: false } });

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
  kunci === "pj1" ? "penjual.demo@example.com"
  : kunci === "pb1" ? "pembeli.demo@example.com"
  : `${kunci}.simulasi@example.com`;

function cek(error, langkah) {
  if (error) {
    console.error(`Gagal ${langkah}: ${error.message}`);
    process.exit(1);
  }
}

let semuaPengguna = null;
async function cariPenggunaLewatEmail(email) {
  if (!semuaPengguna) {
    semuaPengguna = [];
    for (let page = 1; ; page++) {
      const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
      cek(error, "membaca daftar pengguna");
      semuaPengguna.push(...data.users);
      if (data.users.length < 1000) break;
    }
  }
  return semuaPengguna.find((u) => u.email === email);
}

async function pastikanAkun(orang, peran) {
  const email = emailUntuk(orang.kunci);
  const { data, error } = await db.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { peran, nama: orang.nama },
  });
  if (!error) return { id: data.user.id, email };
  const ada = await cariPenggunaLewatEmail(email);
  if (!ada) cek(error, `membuat akun ${email}`);
  return { id: ada.id, email };
}

console.log(`Seed DATA SIMULASI, hari ini ${hariIni}\n`);

cek((await db.from("komoditas").upsert(sim.komoditas)).error, "upsert komoditas");
cek((await db.from("kecamatan").upsert(kecamatan)).error, "upsert kecamatan");
console.log(`✓ ${sim.komoditas.length} komoditas, ${kecamatan.length} kecamatan`);

const akun = [];
for (const [daftar, peran] of [[sim.penjual, "penjual"], [sim.pembeli, "pembeli"]]) {
  for (const orang of daftar) {
    const { id, email } = await pastikanAkun(orang, peran);
    cek(
      (
        await db.from("profiles").upsert({
          id,
          peran,
          nama: orang.nama,
          nama_usaha: orang.nama_usaha,
          kecamatan_id: orang.kecamatan_id,
          no_hp: orang.no_hp,
        })
      ).error,
      `upsert profil ${email}`,
    );
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

console.log(`\nAkun demo (password: ${process.env.SEED_PASSWORD ? "dari SEED_PASSWORD" : PASSWORD}):`);
console.log("  Penjual: penjual.demo@example.com");
console.log("  Pembeli: pembeli.demo@example.com");
