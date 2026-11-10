import type { SupabaseClient } from "@supabase/supabase-js";
import { bacaBody, dariGalatDb, galat, sesiWajib } from "@/lib/api";
import { cariKecamatan } from "@/lib/data/statis";
import { SkemaUbahProfil } from "@/lib/skema-api";
import type { Profile } from "@/types";

// Pemilik: A.
// Profil sendiri dibaca lewat fungsi database profil_saya(), karena kolom no_hp
// tidak bisa di-select langsung dari tabel profiles (lihat supabase/README.md).

type ProfilSaya = Profile & { email: string | null };

async function bacaProfil(supabase: SupabaseClient, email: string | null) {
  const { data, error } = await supabase.rpc("profil_saya");
  if (error) return { profil: null, error };
  const baris = ((data ?? []) as Record<string, unknown>[])[0];
  if (!baris) return { profil: null, error: null };
  const profil: ProfilSaya = {
    id: String(baris.id),
    peran: baris.peran as Profile["peran"],
    nama: String(baris.nama),
    nama_usaha: baris.nama_usaha == null ? null : String(baris.nama_usaha),
    kecamatan_id: (baris.kecamatan_id == null ? null : Number(baris.kecamatan_id)) as number,
    no_hp: baris.no_hp == null ? null : String(baris.no_hp),
    email,
  };
  return { profil, error: null };
}

// GET /api/profil
// Sukses: Profile + { email }. no_hp terisi karena ini profil sendiri.
export async function GET() {
  const sesi = await sesiWajib();
  if (!sesi.ok) return sesi.respons;
  const { supabase, email } = sesi.data;

  const { profil, error } = await bacaProfil(supabase, email);
  if (error) return dariGalatDb(error, "GET /api/profil");
  if (!profil) return galat("Profil tidak ditemukan.", 404);

  return Response.json(profil, { headers: { "cache-control": "no-store" } });
}

// PATCH /api/profil
// Body:   { nama?, nama_usaha?, kecamatan_id?, no_hp? }   minimal satu
// Sukses: Profile + { email } setelah diubah. Peran tidak bisa diganti.
export async function PATCH(request: Request) {
  const sesi = await sesiWajib();
  if (!sesi.ok) return sesi.respons;
  const { supabase, userId, email } = sesi.data;

  const body = await bacaBody(request, SkemaUbahProfil);
  if (!body.ok) return body.respons;

  const ubah: Record<string, string | number | null> = {};
  if (body.data.nama !== undefined) ubah.nama = body.data.nama;
  if (body.data.nama_usaha !== undefined) ubah.nama_usaha = body.data.nama_usaha;
  if (body.data.kecamatan_id !== undefined) {
    if (!cariKecamatan(body.data.kecamatan_id)) return galat("Kecamatan tidak dikenal.", 400);
    ubah.kecamatan_id = body.data.kecamatan_id;
  }
  if (body.data.no_hp !== undefined) ubah.no_hp = body.data.no_hp;

  const { data, error } = await supabase.from("profiles").update(ubah).eq("id", userId).select("id");
  if (error) return dariGalatDb(error, "PATCH /api/profil");
  if (!data?.length) return galat("Profil tidak ditemukan.", 404);

  const hasil = await bacaProfil(supabase, email);
  if (hasil.error) return dariGalatDb(hasil.error, "PATCH /api/profil");
  if (!hasil.profil) return galat("Profil tidak ditemukan.", 404);

  return Response.json(hasil.profil);
}
