-- PanenPasti · migrasi 4: kebutuhan, orders, notifikasi, harga_historis
--
-- orders dan notifikasi tidak bisa ditulis langsung oleh klien. Semua perubahan
-- lewat fungsi buat_pesanan / ubah_status (migrasi 5), supaya stok, status, dan
-- notifikasi selalu berubah dalam satu transaksi.

-- ---------------------------------------------------------------------------
-- kebutuhan (hasil AI-1 atau form manual pembeli)
-- ---------------------------------------------------------------------------

create table public.kebutuhan (
  id uuid primary key default gen_random_uuid(),
  pembeli_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  komoditas_id integer not null references public.komoditas (id),
  jumlah_kg numeric(10, 2) not null check (jumlah_kg > 0 and jumlah_kg <= 100000),
  tgl_butuh date not null,
  berulang text check (
    berulang is null
    or berulang ~ '^mingguan:(senin|selasa|rabu|kamis|jumat|sabtu|minggu)$'
  ),
  -- Kalimat asli pembeli disimpan untuk transparansi AI-1.
  teks_asli text check (teks_asli is null or char_length(teks_asli) <= 500),
  dibuat_ai boolean not null default false,
  dibuat_pada timestamptz not null default now()
);

create index kebutuhan_pembeli_idx on public.kebutuhan (pembeli_id, dibuat_pada desc);

create or replace function public.kebutuhan_sebelum_simpan()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.pembeli_id := auth.uid();
      new.dibuat_pada := now();
    else
      new.id := old.id;
      new.pembeli_id := old.pembeli_id;
      new.dibuat_pada := old.dibuat_pada;
    end if;
  end if;

  if tg_op = 'INSERT' then
    if not exists (
      select 1 from public.profiles p where p.id = new.pembeli_id and p.peran = 'pembeli'
    ) then
      raise exception using errcode = 'PP403',
        message = 'Hanya pembeli yang bisa menyimpan kebutuhan.';
    end if;
  end if;

  return new;
end;
$$;

create trigger kebutuhan_sebelum_simpan
  before insert or update on public.kebutuhan
  for each row execute function public.kebutuhan_sebelum_simpan();

alter table public.kebutuhan enable row level security;

create policy kebutuhan_baca_sendiri on public.kebutuhan
  for select to authenticated
  using (pembeli_id = (select auth.uid()));

create policy kebutuhan_tambah_sendiri on public.kebutuhan
  for insert to authenticated
  with check (pembeli_id = (select auth.uid()));

create policy kebutuhan_ubah_sendiri on public.kebutuhan
  for update to authenticated
  using (pembeli_id = (select auth.uid()))
  with check (pembeli_id = (select auth.uid()));

create policy kebutuhan_hapus_sendiri on public.kebutuhan
  for delete to authenticated
  using (pembeli_id = (select auth.uid()));

revoke all on table public.kebutuhan from anon, authenticated;
grant select, insert, update, delete on table public.kebutuhan to authenticated;
grant all on table public.kebutuhan to service_role;
revoke all on function public.kebutuhan_sebelum_simpan() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  pembeli_id uuid not null references public.profiles (id) on delete cascade,
  kebutuhan_id uuid references public.kebutuhan (id) on delete set null,
  jumlah_kg numeric(10, 2) not null check (jumlah_kg > 0),
  -- Harga saat memesan. Tidak ikut berubah kalau penjual mengganti harga listing.
  harga_per_kg integer not null check (harga_per_kg > 0),
  status text not null default 'menunggu' check (
    status in ('menunggu', 'dikonfirmasi', 'dikirim', 'selesai', 'ditolak', 'dibatalkan', 'gagal_panen')
  ),
  alasan_batal text check (alasan_batal is null or char_length(alasan_batal) <= 300),
  dibuat_pada timestamptz not null default now(),
  diubah_pada timestamptz not null default now()
);

create index orders_pembeli_idx on public.orders (pembeli_id, dibuat_pada desc);
create index orders_listing_idx on public.orders (listing_id, dibuat_pada desc);
create index orders_menunggu_idx on public.orders (dibuat_pada) where status = 'menunggu';

alter table public.orders enable row level security;

-- Pesanan hanya terlihat oleh pembelinya dan oleh penjual pemilik listing.
create policy orders_baca_pihak_terkait on public.orders
  for select to authenticated
  using (
    pembeli_id = (select auth.uid())
    or exists (
      select 1
      from public.listings l
      where l.id = orders.listing_id
        and l.penjual_id = (select auth.uid())
    )
  );

revoke all on table public.orders from anon, authenticated;
grant select on table public.orders to authenticated;
grant all on table public.orders to service_role;

-- Listing yang sudah punya pesanan tidak boleh dihapus penjual: riwayat pesanan
-- pembeli ikut hilang (foreign key cascade). Penjual cukup mengubah status
-- menjadi habis. service_role tetap boleh, dipakai skrip seed untuk mengulang data.
create or replace function public.listings_sebelum_hapus()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Dua IF bertingkat, bukan satu kondisi dengan AND: query ke orders hanya
  -- dijalankan untuk klien langsung. Penghapusan akun oleh Supabase Auth ikut
  -- menghapus listing lewat cascade dan tidak boleh tersandung pengecekan ini.
  if current_user in ('authenticated', 'anon') then
    -- Penjual bisa melihat semua pesanan di listing miliknya (policy orders di
    -- atas), jadi pengecekan ini tidak terhalang RLS.
    if exists (select 1 from public.orders o where o.listing_id = old.id) then
      raise exception using errcode = 'PP409',
        message = 'Panen yang sudah punya pesanan tidak bisa dihapus. Ubah statusnya menjadi habis.';
    end if;
  end if;
  return old;
end;
$$;

create trigger listings_sebelum_hapus
  before delete on public.listings
  for each row execute function public.listings_sebelum_hapus();

revoke all on function public.listings_sebelum_hapus() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- notifikasi (hanya in-app)
-- ---------------------------------------------------------------------------

create table public.notifikasi (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  tipe text not null check (tipe in ('pesanan_baru', 'status_berubah', 'surplus', 'pengganti_tersedia')),
  pesan text not null check (char_length(pesan) between 1 and 500),
  order_id uuid references public.orders (id) on delete cascade,
  -- Diisi untuk notifikasi surplus, supaya klien bisa menautkan ke listing-nya.
  listing_id uuid references public.listings (id) on delete cascade,
  dibaca boolean not null default false,
  dibuat_pada timestamptz not null default now(),
  -- Nomor urut pembuatan. Dua notifikasi yang dibuat dalam satu transaksi (mis.
  -- gagal panen + saran pengganti) punya dibuat_pada yang sama; kolom ini yang
  -- menentukan mana yang lebih baru. Urutkan: dibuat_pada desc, urutan desc.
  urutan bigint generated always as identity
);

create index notifikasi_user_idx on public.notifikasi (user_id, dibuat_pada desc, urutan desc);
create index notifikasi_belum_dibaca_idx on public.notifikasi (user_id) where not dibaca;
create index notifikasi_order_idx on public.notifikasi (order_id);
create index notifikasi_listing_idx on public.notifikasi (listing_id);

-- Klien hanya boleh mengubah kolom dibaca.
create or replace function public.notifikasi_sebelum_ubah()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_dibaca boolean := new.dibaca;
begin
  if current_user in ('authenticated', 'anon') then
    new := old;
    new.dibaca := v_dibaca;
  end if;
  return new;
end;
$$;

create trigger notifikasi_sebelum_ubah
  before update on public.notifikasi
  for each row execute function public.notifikasi_sebelum_ubah();

alter table public.notifikasi enable row level security;

create policy notifikasi_baca_sendiri on public.notifikasi
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy notifikasi_tandai_sendiri on public.notifikasi
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on table public.notifikasi from anon, authenticated;
grant select on table public.notifikasi to authenticated;
grant update (dibaca) on table public.notifikasi to authenticated;
grant all on table public.notifikasi to service_role;
revoke all on function public.notifikasi_sebelum_ubah() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- harga_historis (data publik PIHPS, diimpor scripts/impor-harga.mjs)
-- ---------------------------------------------------------------------------

create table public.harga_historis (
  komoditas_id integer not null references public.komoditas (id),
  tanggal date not null,
  wilayah text not null,
  tingkat text not null check (tingkat in ('produsen', 'pedagang_besar', 'pasar_tradisional')),
  harga integer not null check (harga > 0),
  sumber text not null,
  primary key (komoditas_id, tanggal, wilayah, tingkat)
);

alter table public.harga_historis enable row level security;

create policy harga_historis_baca_semua on public.harga_historis
  for select to anon, authenticated using (true);

revoke all on table public.harga_historis from anon, authenticated;
grant select on table public.harga_historis to anon, authenticated;
grant all on table public.harga_historis to service_role;
