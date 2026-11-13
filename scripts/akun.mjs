// Bantuan bersama untuk skrip yang membuat akun (seed-simulasi.mjs, akun-demo.mjs).
// Memakai service role key, jadi hanya untuk dijalankan di laptop.

import { createClient } from "@supabase/supabase-js";

export const EMAIL_DEMO = {
  penjual: "penjual.demo@example.com",
  pembeli: "pembeli.demo@example.com",
};

/** Kata sandi akun demo. Harus sama dengan DEMO_PASSWORD di server agar tombol akun demo jalan. */
export const PASSWORD_DEMO =
  process.env.DEMO_PASSWORD || process.env.SEED_PASSWORD || "PanenPasti-Demo-2026";

export function keluarGagal(pesan) {
  console.error(`\n✗ ${pesan}`);
  process.exit(1);
}

export function buatKlienAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    keluarGagal("Isi NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di .env.local");
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

/**
 * Pastikan Supabase bisa dihubungi dan migrasi sudah terpasang, dengan pesan
 * yang menyebut langkah perbaikannya.
 */
export async function cekDatabase(db) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let error;
  try {
    ({ error } = await db.from("profiles").select("id").limit(1));
  } catch (e) {
    error = { message: e.message };
  }
  if (!error) return;

  const lokal = /127\.0\.0\.1|localhost/.test(url);
  if (/fetch failed|ECONNREFUSED|ENOTFOUND/i.test(error.message ?? "")) {
    keluarGagal(
      `Supabase tidak bisa dihubungi di ${url}.\n` +
        (lokal
          ? "  Nyalakan Docker Desktop, lalu jalankan: npx supabase start && npx supabase db reset"
          : "  Periksa NEXT_PUBLIC_SUPABASE_URL dan koneksi internet."),
    );
  }
  if (error.code === "42P01" || error.code === "PGRST205" || /does not exist|schema cache/i.test(error.message ?? "")) {
    keluarGagal(
      "Tabel profiles belum ada: migrasi belum dipasang.\n" +
        (lokal
          ? "  Jalankan: npx supabase db reset"
          : "  Jalankan: npx supabase link --project-ref <ref> && npx supabase db push\n  (atau tempel file supabase/migrations/*.sql berurutan di SQL Editor)"),
    );
  }
  if (/invalid api key|jwt|unauthorized/i.test(error.message ?? "")) {
    keluarGagal("SUPABASE_SERVICE_ROLE_KEY ditolak. Salin ulang key service_role dari Project Settings → API.");
  }
  keluarGagal(`Gagal membaca database: ${error.message}`);
}

let semuaPengguna = null;
async function cariPenggunaLewatEmail(db, email) {
  if (!semuaPengguna) {
    semuaPengguna = [];
    for (let page = 1; ; page++) {
      const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) keluarGagal(`Gagal membaca daftar pengguna: ${error.message}`);
      semuaPengguna.push(...data.users);
      if (data.users.length < 1000) break;
    }
  }
  return semuaPengguna.find((u) => u.email === email);
}

/**
 * Buat akun yang langsung aktif (email terkonfirmasi), atau perbaiki akun yang
 * sudah ada: kata sandi disetel ulang dan email dikonfirmasi, supaya akun demo
 * selalu bisa dipakai masuk walau sempat diubah. Profil diisi oleh pemanggil.
 */
export async function pastikanAkun(db, { email, password, peran, nama }) {
  const metadata = { peran, nama };
  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (!error) return { id: data.user.id, baru: true };

  const ada = await cariPenggunaLewatEmail(db, email);
  if (!ada) keluarGagal(`Gagal membuat akun ${email}: ${error.message}`);
  const { error: galatUbah } = await db.auth.admin.updateUserById(ada.id, {
    password,
    email_confirm: true,
    user_metadata: metadata,
    ban_duration: "none",
  });
  if (galatUbah) keluarGagal(`Gagal memperbarui akun ${email}: ${galatUbah.message}`);
  return { id: ada.id, baru: false };
}

/** Upsert profil lengkap. Service role boleh menulis peran dan no_hp. */
export async function simpanProfil(db, id, { peran, nama, nama_usaha, kecamatan_id, no_hp }) {
  const { error } = await db
    .from("profiles")
    .upsert({ id, peran, nama, nama_usaha, kecamatan_id, no_hp });
  if (error) keluarGagal(`Gagal menyimpan profil ${nama}: ${error.message}`);
}
