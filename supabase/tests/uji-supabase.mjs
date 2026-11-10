// Uji backend terhadap project Supabase SUNGGUHAN (hosted atau lokal), lewat jalur
// yang sama dengan aplikasi: Supabase Auth + PostgREST + RLS.
//
//   npm run uji:supabase
//
// Butuh di .env.local: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
// SUPABASE_SERVICE_ROLE_KEY. Migrasi di supabase/migrations harus sudah terpasang.
//
// Skrip membuat 1 penjual dan 3 pembeli sementara (uji-<acak>@example.com dengan
// kata sandi acak), menjalankan pemeriksaan, lalu menghapus semuanya lagi, juga
// kalau ada pemeriksaan yang gagal. Data lain di database tidak disentuh.
//
// Yang diperiksa:
//   1. data referensi dan trigger profil
//   2. privasi nomor HP dan RLS (pengguna X tidak bisa mengubah data pengguna Y)
//   3. dua pesanan bersamaan tidak membuat stok minus
//   4. alur status, kontak setelah dikonfirmasi, notifikasi, alert surplus
//
// Logika SQL yang sama juga diuji tanpa Supabase oleh `npm test`
// (supabase/tests/*.test.ts). Skrip ini melengkapinya dengan uji di database
// sungguhan, termasuk transaksi yang benar-benar bersamaan.

import { randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anonKey || !serviceKey) {
  console.error(
    "Isi NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, dan SUPABASE_SERVICE_ROLE_KEY di .env.local",
  );
  process.exit(1);
}

const opsi = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, serviceKey, opsi);
const tamu = createClient(url, anonKey, opsi);

const PUTARAN_KONKURENSI = 5;
const kataSandi = randomBytes(18).toString("base64url");
const penanda = randomUUID().slice(0, 8);
const dibuat = [];
let lulus = 0;
let gagal = 0;

function cek(nama, kondisi, detail = "") {
  if (kondisi) {
    lulus++;
    console.log(`  ✓ ${nama}`);
  } else {
    gagal++;
    console.log(`  ✗ ${nama}${detail ? `  → ${detail}` : ""}`);
  }
}

function wajib(error, langkah) {
  if (error) throw new Error(`${langkah}: ${error.message}`);
}

const hariIniWib = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
function tambahHari(tanggal, n) {
  const d = new Date(`${tanggal}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

async function buatAkun(peran, nama, kecamatanId, noHp) {
  const email = `uji-${penanda}-${nama.toLowerCase()}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: kataSandi,
    email_confirm: true,
    user_metadata: { peran, nama, nama_usaha: `Usaha ${nama} (Uji)`, kecamatan_id: kecamatanId, no_hp: noHp },
  });
  wajib(error, `membuat akun ${email}`);
  dibuat.push(data.user.id);

  const klien = createClient(url, anonKey, opsi);
  const masuk = await klien.auth.signInWithPassword({ email, password: kataSandi });
  wajib(masuk.error, `login ${email}`);
  return { id: data.user.id, klien };
}

async function buatListing(penjual, jumlahKg) {
  const { data, error } = await penjual.klien
    .from("listings")
    .insert({
      komoditas_id: 1,
      jumlah_kg: jumlahKg,
      harga_per_kg: 60000,
      tgl_panen: tambahHari(hariIniWib, 14),
      kualitas: "Uji otomatis",
    })
    .select("id, penjual_id, sisa_kg, status, is_surplus")
    .single();
  wajib(error, "penjual menambah listing");
  return data;
}

async function sisaStok(listingId) {
  const { data, error } = await admin.from("listings").select("sisa_kg").eq("id", listingId).single();
  wajib(error, "membaca sisa stok");
  return Number(data.sisa_kg);
}

async function jalankan() {
  console.log(`Uji backend PanenPasti di ${url}\n`);

  console.log("1. Data referensi dan profil");
  const kecamatan = await tamu.from("kecamatan").select("id", { count: "exact", head: true });
  cek("72 kecamatan terbaca tanpa login", kecamatan.count === 72, `jumlah: ${kecamatan.count}`);

  const penjual = await buatAkun("penjual", "Penjual", 3205120, "0812-0000-0101");
  const pembeliA = await buatAkun("pembeli", "PembeliA", 3273240, "081200000201");
  const pembeliB = await buatAkun("pembeli", "PembeliB", 3273260, "081200000202");
  const pembeliC = await buatAkun("pembeli", "PembeliC", 3273240, "081200000203");

  const profil = await admin.from("profiles").select("peran, kecamatan_id, no_hp").eq("id", penjual.id).single();
  cek(
    "trigger membuat profil dari metadata dan merapikan nomor HP",
    profil.data?.peran === "penjual" &&
      profil.data?.kecamatan_id === 3205120 &&
      profil.data?.no_hp === "6281200000101",
    JSON.stringify(profil.data ?? profil.error?.message),
  );

  console.log("\n2. Privasi dan RLS");
  const intipHp = await pembeliA.klien.from("profiles").select("no_hp").eq("id", penjual.id);
  cek("nomor HP penjual tidak bisa di-select pembeli", Boolean(intipHp.error), "select no_hp berhasil");
  const profilPublik = await pembeliA.klien.from("profiles").select("id, nama, kecamatan_id").eq("id", penjual.id);
  cek("nama dan kecamatan penjual tetap terlihat", profilPublik.data?.length === 1);
  const profilSaya = await pembeliA.klien.rpc("profil_saya");
  cek("profil_saya() mengembalikan nomor HP sendiri", profilSaya.data?.[0]?.no_hp === "6281200000201");
  const gantiPeran = await pembeliA.klien.from("profiles").update({ peran: "penjual" }).eq("id", pembeliA.id);
  cek("pengguna tidak bisa mengganti perannya", Boolean(gantiPeran.error));

  const listing = await buatListing(penjual, 100);
  cek(
    "penjual menambah listing; sisa stok diisi server",
    listing.penjual_id === penjual.id && Number(listing.sisa_kg) === 100,
  );
  const listingPembeli = await pembeliA.klien
    .from("listings")
    .insert({ komoditas_id: 1, jumlah_kg: 10, harga_per_kg: 60000, tgl_panen: tambahHari(hariIniWib, 14) });
  cek("pembeli tidak bisa menambah listing", Boolean(listingPembeli.error));
  const ubahOrangLain = await pembeliA.klien
    .from("listings")
    .update({ harga_per_kg: 1000 })
    .eq("id", listing.id)
    .select("id");
  cek("pengguna lain tidak bisa mengubah listing ini", (ubahOrangLain.data?.length ?? 0) === 0);
  const ubahSisa = await penjual.klien.from("listings").update({ sisa_kg: 1 }).eq("id", listing.id).select("sisa_kg");
  cek("penjual tidak bisa mengubah sisa stok secara langsung", Number(ubahSisa.data?.[0]?.sisa_kg) === 100);
  const pesananLangsung = await pembeliA.klien
    .from("orders")
    .insert({ listing_id: listing.id, pembeli_id: pembeliA.id, jumlah_kg: 1, harga_per_kg: 1, status: "selesai" });
  cek("tabel orders tidak bisa ditulis langsung", Boolean(pesananLangsung.error));
  const tanpaLogin = await tamu.rpc("buat_pesanan", { p_listing_id: listing.id, p_jumlah_kg: 1 });
  cek("buat_pesanan menolak panggilan tanpa login", Boolean(tanpaLogin.error));

  console.log("\n3. Dua pesanan bersamaan");
  let putaranBenar = 0;
  for (let i = 0; i < PUTARAN_KONKURENSI; i++) {
    const l = await buatListing(penjual, 100);
    const hasil = await Promise.all(
      [pembeliA, pembeliB].map((p) => p.klien.rpc("buat_pesanan", { p_listing_id: l.id, p_jumlah_kg: 60 })),
    );
    const sukses = hasil.filter((h) => !h.error).length;
    const kodeGagal = hasil.filter((h) => h.error).map((h) => h.error.code);
    const sisa = await sisaStok(l.id);
    if (sukses === 1 && sisa === 40 && kodeGagal[0] === "PP409") putaranBenar++;
    else console.log(`    putaran ${i + 1}: sukses=${sukses} sisa=${sisa} galat=${kodeGagal.join(",")}`);
  }
  cek(
    `2 pesanan 60 kg bersamaan pada stok 100 kg, ${PUTARAN_KONKURENSI} putaran: tepat satu berhasil, sisa 40`,
    putaranBenar === PUTARAN_KONKURENSI,
    `${putaranBenar}/${PUTARAN_KONKURENSI} putaran benar`,
  );

  const ramai = await buatListing(penjual, 100);
  const serbuan = await Promise.all(
    Array.from({ length: 12 }, (_, i) =>
      [pembeliA, pembeliB, pembeliC][i % 3].klien.rpc("buat_pesanan", { p_listing_id: ramai.id, p_jumlah_kg: 15 }),
    ),
  );
  const suksesSerbuan = serbuan.filter((h) => !h.error).length;
  const sisaRamai = await sisaStok(ramai.id);
  cek(
    "12 pesanan 15 kg bersamaan pada stok 100 kg: 6 berhasil, sisa 10",
    suksesSerbuan === 6 && sisaRamai === 10,
    `sukses=${suksesSerbuan} sisa=${sisaRamai}`,
  );

  console.log("\n4. Alur status, kontak, notifikasi, surplus");
  const pesan = await pembeliA.klien.rpc("buat_pesanan", { p_listing_id: listing.id, p_jumlah_kg: 20 });
  wajib(pesan.error, "pembeli A memesan 20 kg");
  const orderId = pesan.data.id;
  cek("pesanan dibuat dengan status menunggu", pesan.data.status === "menunggu" && (await sisaStok(listing.id)) === 80);

  const intipPesanan = await pembeliB.klien.from("orders").select("id").eq("id", orderId);
  cek("pembeli lain tidak bisa melihat pesanan ini", (intipPesanan.data?.length ?? 0) === 0);
  const serobot = await pembeliB.klien.rpc("ubah_status", { p_order_id: orderId, p_status_baru: "dibatalkan" });
  cek("pembeli lain tidak bisa mengubah status pesanan ini", serobot.error?.code === "PP404", serobot.error?.code);
  const pembeliKonfirmasi = await pembeliA.klien.rpc("ubah_status", {
    p_order_id: orderId,
    p_status_baru: "dikonfirmasi",
  });
  cek("pembeli tidak bisa mengonfirmasi pesanannya sendiri", pembeliKonfirmasi.error?.code === "PP403");

  const kontakSebelum = await pembeliA.klien.rpc("kontak_pesanan", { p_order_id: orderId });
  cek("kontak penjual tertutup selama menunggu", (kontakSebelum.data?.length ?? 0) === 0);

  const konfirmasi = await penjual.klien.rpc("ubah_status", { p_order_id: orderId, p_status_baru: "dikonfirmasi" });
  cek("penjual mengonfirmasi pesanan", konfirmasi.data?.status === "dikonfirmasi", konfirmasi.error?.message);

  const kontakSesudah = await pembeliA.klien.rpc("kontak_pesanan", { p_order_id: orderId });
  cek("kontak penjual terbuka setelah dikonfirmasi", kontakSesudah.data?.[0]?.no_hp === "6281200000101");
  const kontakPenjual = await penjual.klien.rpc("kontak_pesanan", { p_order_id: orderId });
  cek("kontak pembeli terbuka untuk penjual", kontakPenjual.data?.[0]?.no_hp === "6281200000201");
  const kontakOrangLain = await pembeliB.klien.rpc("kontak_pesanan", { p_order_id: orderId });
  cek("orang di luar pesanan tidak mendapat kontak", (kontakOrangLain.data?.length ?? 0) === 0);

  const notifPembeli = await pembeliA.klien.from("notifikasi").select("tipe, pesan").eq("order_id", orderId);
  cek(
    "pembeli mendapat notifikasi perubahan status",
    notifPembeli.data?.some((n) => n.tipe === "status_berubah") === true,
  );
  const notifPenjual = await penjual.klien.from("notifikasi").select("tipe").eq("order_id", orderId);
  cek("penjual mendapat notifikasi pesanan baru", notifPenjual.data?.some((n) => n.tipe === "pesanan_baru") === true);

  const gagalPanen = await penjual.klien.rpc("ubah_status", {
    p_order_id: orderId,
    p_status_baru: "gagal_panen",
    p_alasan: "uji otomatis: hujan terus",
  });
  cek(
    "gagal panen mengembalikan stok",
    gagalPanen.data?.status === "gagal_panen" && (await sisaStok(listing.id)) === 100,
    gagalPanen.error?.message,
  );

  const surplus = await penjual.klien.rpc("tandai_surplus", { p_listing_id: listing.id, p_harga_surplus: 52000 });
  cek("penjual menandai surplus", surplus.data?.is_surplus === true && surplus.data?.harga_surplus === 52000);
  const notifSurplus = await pembeliC.klien
    .from("notifikasi")
    .select("id, dibaca")
    .eq("listing_id", listing.id)
    .eq("tipe", "surplus");
  cek("pembeli di Kota Bandung mendapat notifikasi surplus", notifSurplus.data?.length === 1);

  const tandaiDibaca = await pembeliC.klien
    .from("notifikasi")
    .update({ dibaca: true })
    .eq("user_id", pembeliC.id)
    .eq("dibaca", false)
    .select("id");
  cek("pembeli menandai notifikasinya sudah dibaca", (tandaiDibaca.data?.length ?? 0) >= 1, tandaiDibaca.error?.message);
  const ubahPesan = await pembeliC.klien.from("notifikasi").update({ pesan: "palsu" }).eq("user_id", pembeliC.id);
  cek("isi notifikasi tidak bisa diubah", Boolean(ubahPesan.error));
}

async function bersihkan() {
  // Menghapus akun ikut menghapus profil, listing, pesanan, dan notifikasinya (cascade).
  for (const id of dibuat) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) console.error(`  Gagal menghapus akun uji ${id}: ${error.message}`);
  }
}

let galatFatal = null;
try {
  await jalankan();
} catch (e) {
  galatFatal = e;
} finally {
  await bersihkan();
}

if (galatFatal) {
  console.error(`\nBerhenti di tengah jalan: ${galatFatal.message}`);
  console.error("Periksa bahwa semua migrasi di supabase/migrations sudah terpasang.");
  process.exitCode = 1;
} else {
  console.log(`\n${lulus} lulus, ${gagal} gagal. ${dibuat.length} akun uji sudah dihapus.`);
  process.exitCode = gagal === 0 ? 0 : 1;
}
