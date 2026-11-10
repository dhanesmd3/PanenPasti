-- PanenPasti · migrasi 1: skema dasar
-- Tabel: kecamatan, komoditas, profiles, listings (docs/PRD bagian 11).
--
-- Aturan yang berlaku di semua migrasi:
--   1. Row Level Security aktif di setiap tabel.
--   2. Hak akses ditulis eksplisit (revoke lalu grant), tidak bergantung pada
--      default privileges project Supabase.
--   3. Galat bisnis memakai SQLSTATE 'PPxxx'; tiga digit terakhir adalah status
--      HTTP yang dipakai route handler (PP401, PP403, PP404, PP409, PP422).
--   4. "Klien langsung" = permintaan dari browser lewat PostgREST, yaitu role
--      authenticated atau anon. Fungsi SECURITY DEFINER dan service_role bukan
--      klien langsung, jadi boleh mengubah kolom yang dilindungi trigger.

-- ---------------------------------------------------------------------------
-- Fungsi bantu
-- ---------------------------------------------------------------------------

create or replace function public.hari_ini_wib()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Asia/Jakarta')::date;
$$;

-- 20.00 -> '20', 20.50 -> '20,5', 1250.25 -> '1250,25'
create or replace function public.format_kg(p numeric)
returns text
language sql
immutable
set search_path = ''
as $$
  select replace(rtrim(rtrim(to_char(round(p, 2), 'FM9999999990.00'), '0'), '.'), '.', ',');
$$;

-- 62000 -> 'Rp62.000'
create or replace function public.format_rupiah(p numeric)
returns text
language sql
immutable
set search_path = ''
as $$
  select 'Rp' || replace(to_char(round(p), 'FM999,999,999,990'), ',', '.');
$$;

-- 2026-12-01 -> '1 Des 2026'
create or replace function public.format_tanggal(p date)
returns text
language sql
immutable
set search_path = ''
as $$
  select extract(day from p)::int::text
    || ' '
    || (array['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'])[extract(month from p)::int]
    || ' '
    || extract(year from p)::int::text;
$$;

-- Jarak garis lurus (haversine) dalam km. Rumusnya sama dengan lib/matching.ts.
create or replace function public.jarak_km(
  lat1 double precision,
  lng1 double precision,
  lat2 double precision,
  lng2 double precision
)
returns double precision
language sql
immutable
set search_path = ''
as $$
  select 2 * 6371 * asin(sqrt(least(1.0,
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  )));
$$;

-- Nomor HP disimpan dalam format wa.me: 62xxxxxxxxxx, tanpa "+" dan tanpa spasi.
-- '0812-0000-0101' -> '6281200000101', '+62 812 0000 0101' -> '6281200000101'.
-- Masukan tanpa angka dikembalikan apa adanya supaya ditolak oleh check constraint.
create or replace function public.normalisasi_no_hp(p text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v text;
begin
  if p is null or btrim(p) = '' then
    return null;
  end if;
  v := regexp_replace(p, '[^0-9]', '', 'g');
  if v = '' then
    return btrim(p);
  end if;
  if left(v, 2) = '62' then
    return v;
  elsif left(v, 1) = '0' then
    return '62' || substr(v, 2);
  elsif left(v, 1) = '8' then
    return '62' || v;
  end if;
  return v;
end;
$$;

revoke all on function public.hari_ini_wib() from public, anon;
revoke all on function public.format_kg(numeric) from public, anon;
revoke all on function public.format_rupiah(numeric) from public, anon;
revoke all on function public.format_tanggal(date) from public, anon;
revoke all on function public.jarak_km(double precision, double precision, double precision, double precision) from public, anon;
revoke all on function public.normalisasi_no_hp(text) from public, anon;
grant execute on function public.hari_ini_wib() to authenticated, service_role;
grant execute on function public.format_kg(numeric) to authenticated, service_role;
grant execute on function public.format_rupiah(numeric) to authenticated, service_role;
grant execute on function public.format_tanggal(date) to authenticated, service_role;
grant execute on function public.jarak_km(double precision, double precision, double precision, double precision) to authenticated, service_role;
grant execute on function public.normalisasi_no_hp(text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- kecamatan & komoditas (data referensi, dibaca semua orang)
-- ---------------------------------------------------------------------------

create table public.kecamatan (
  id integer primary key,
  nama text not null,
  kab_kota text not null,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180)
);

comment on table public.kecamatan is
  'Kecamatan di Kab. Garut dan Kota Bandung. id = kode wilayah 7 digit. Sumber: data/kecamatan.csv (Wikidata, CC0).';

create table public.komoditas (
  id integer primary key,
  nama text not null unique,
  satuan text not null default 'kg' check (satuan = 'kg')
);

alter table public.kecamatan enable row level security;
alter table public.komoditas enable row level security;

create policy kecamatan_baca_semua on public.kecamatan
  for select to anon, authenticated using (true);

create policy komoditas_baca_semua on public.komoditas
  for select to anon, authenticated using (true);

revoke all on table public.kecamatan from anon, authenticated;
revoke all on table public.komoditas from anon, authenticated;
grant select on table public.kecamatan to anon, authenticated;
grant select on table public.komoditas to anon, authenticated;
grant all on table public.kecamatan to service_role;
grant all on table public.komoditas to service_role;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  peran text not null check (peran in ('penjual', 'pembeli')),
  nama text not null check (char_length(nama) between 1 and 80),
  nama_usaha text check (nama_usaha is null or char_length(nama_usaha) <= 120),
  -- Boleh kosong sesaat setelah akun dibuat; aplikasi meminta pengguna melengkapinya.
  kecamatan_id integer references public.kecamatan (id),
  no_hp text check (no_hp is null or no_hp ~ '^62[0-9]{8,13}$'),
  dibuat_pada timestamptz not null default now(),
  diubah_pada timestamptz not null default now()
);

comment on column public.profiles.no_hp is
  'Format wa.me (62...). Tidak bisa di-select klien. Dibaca lewat profil_saya() atau kontak_pesanan().';

create index profiles_peran_idx on public.profiles (peran);
create index profiles_kecamatan_idx on public.profiles (kecamatan_id);

create or replace function public.profiles_sebelum_simpan()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.nama := btrim(new.nama);
  new.nama_usaha := nullif(btrim(new.nama_usaha), '');
  new.no_hp := public.normalisasi_no_hp(new.no_hp);

  if tg_op = 'UPDATE' then
    if current_user in ('authenticated', 'anon') then
      -- Peran dipilih sekali saat daftar dan tidak bisa diganti dari klien.
      new.id := old.id;
      new.peran := old.peran;
      new.dibuat_pada := old.dibuat_pada;
    end if;
    new.diubah_pada := now();
  end if;

  return new;
end;
$$;

create trigger profiles_sebelum_simpan
  before insert or update on public.profiles
  for each row execute function public.profiles_sebelum_simpan();

alter table public.profiles enable row level security;

-- Nama, nama usaha, dan kecamatan memang perlu terlihat (kartu listing, matching).
-- no_hp dilindungi lewat hak kolom di bawah, karena RLS tidak bekerja per kolom.
create policy profiles_baca_login on public.profiles
  for select to authenticated using (true);

create policy profiles_ubah_sendiri on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Tidak ada policy insert/delete: baris dibuat trigger auth (migrasi auth_profil)
-- dan ikut terhapus saat akun dihapus.

revoke all on table public.profiles from anon, authenticated;
grant select (id, peran, nama, nama_usaha, kecamatan_id, dibuat_pada, diubah_pada)
  on table public.profiles to authenticated;
grant update (nama, nama_usaha, kecamatan_id, no_hp)
  on table public.profiles to authenticated;
grant all on table public.profiles to service_role;

-- ---------------------------------------------------------------------------
-- listings
-- ---------------------------------------------------------------------------

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  penjual_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  komoditas_id integer not null references public.komoditas (id),
  jumlah_kg numeric(10, 2) not null check (jumlah_kg > 0 and jumlah_kg <= 100000),
  -- Hanya berubah lewat buat_pesanan/ubah_status, atau ikut bergeser saat jumlah_kg diubah.
  sisa_kg numeric(10, 2) not null check (sisa_kg >= 0),
  kualitas text check (kualitas is null or char_length(kualitas) <= 100),
  tgl_panen date not null,
  harga_per_kg integer not null check (harga_per_kg between 1000 and 1000000),
  foto_url text check (foto_url is null or char_length(foto_url) <= 500),
  status text not null default 'estimasi' check (status in ('estimasi', 'siap', 'habis')),
  is_surplus boolean not null default false,
  harga_surplus integer check (harga_surplus is null or harga_surplus >= 100),
  dibuat_pada timestamptz not null default now(),
  diubah_pada timestamptz not null default now(),
  constraint listings_sisa_tidak_melebihi_jumlah check (sisa_kg <= jumlah_kg),
  constraint listings_surplus_punya_harga check (
    (is_surplus and harga_surplus is not null and harga_surplus < harga_per_kg)
    or (not is_surplus and harga_surplus is null)
  )
);

create index listings_penjual_idx on public.listings (penjual_id);
create index listings_katalog_idx on public.listings (komoditas_id, tgl_panen) where status <> 'habis';
create index listings_surplus_idx on public.listings (tgl_panen) where is_surplus;

create or replace function public.listings_sebelum_simpan()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_klien boolean := current_user in ('authenticated', 'anon');
begin
  if tg_op = 'INSERT' then
    if v_klien then
      new.penjual_id := auth.uid();
      new.sisa_kg := new.jumlah_kg;
      new.is_surplus := false;
      new.harga_surplus := null;
      new.dibuat_pada := now();
      new.diubah_pada := now();
      if new.status = 'habis' then
        raise exception using errcode = 'PP422',
          message = 'Status panen baru harus estimasi atau siap.';
      end if;
      if new.tgl_panen < public.hari_ini_wib() then
        raise exception using errcode = 'PP422',
          message = 'Tanggal panen tidak boleh di masa lalu.';
      end if;
    end if;

    if new.sisa_kg is null then
      new.sisa_kg := new.jumlah_kg;
    end if;

    if not exists (
      select 1 from public.profiles p where p.id = new.penjual_id and p.peran = 'penjual'
    ) then
      raise exception using errcode = 'PP403',
        message = 'Hanya penjual yang bisa menambah panen.';
    end if;

    return new;
  end if;

  -- UPDATE
  if v_klien then
    new.id := old.id;
    new.penjual_id := old.penjual_id;
    new.sisa_kg := old.sisa_kg;
    new.is_surplus := old.is_surplus;
    new.harga_surplus := old.harga_surplus;
    new.dibuat_pada := old.dibuat_pada;
    if new.tgl_panen <> old.tgl_panen and new.tgl_panen < public.hari_ini_wib() then
      raise exception using errcode = 'PP422',
        message = 'Tanggal panen tidak boleh di masa lalu.';
    end if;
  end if;

  -- Jumlah panen diubah: sisa stok bergeser sebesar selisihnya, supaya kg yang
  -- sudah dipesan tetap terkunci.
  if new.jumlah_kg <> old.jumlah_kg and new.sisa_kg = old.sisa_kg then
    new.sisa_kg := old.sisa_kg + (new.jumlah_kg - old.jumlah_kg);
    if new.sisa_kg < 0 then
      raise exception using errcode = 'PP409',
        message = format(
          'Jumlah panen tidak boleh lebih kecil dari yang sudah dipesan (%s kg).',
          public.format_kg(old.jumlah_kg - old.sisa_kg)
        );
    end if;
  end if;

  -- Status mengikuti stok.
  if new.sisa_kg = 0 then
    new.status := 'habis';
  elsif old.sisa_kg = 0 and new.status = 'habis' then
    new.status := case when new.tgl_panen <= public.hari_ini_wib() then 'siap' else 'estimasi' end;
  end if;

  -- Harga normal turun sampai menyentuh harga surplus: tanda surplus dilepas.
  if new.is_surplus and new.harga_surplus is not null and new.harga_surplus >= new.harga_per_kg then
    new.is_surplus := false;
    new.harga_surplus := null;
  end if;

  new.diubah_pada := now();
  return new;
end;
$$;

create trigger listings_sebelum_simpan
  before insert or update on public.listings
  for each row execute function public.listings_sebelum_simpan();

alter table public.listings enable row level security;

create policy listings_baca_login on public.listings
  for select to authenticated using (true);

create policy listings_tambah_sendiri on public.listings
  for insert to authenticated
  with check (penjual_id = (select auth.uid()));

create policy listings_ubah_sendiri on public.listings
  for update to authenticated
  using (penjual_id = (select auth.uid()))
  with check (penjual_id = (select auth.uid()));

create policy listings_hapus_sendiri on public.listings
  for delete to authenticated
  using (penjual_id = (select auth.uid()));

revoke all on table public.listings from anon, authenticated;
grant select, insert, update, delete on table public.listings to authenticated;
grant all on table public.listings to service_role;

revoke all on function public.profiles_sebelum_simpan() from public, anon, authenticated;
revoke all on function public.listings_sebelum_simpan() from public, anon, authenticated;
