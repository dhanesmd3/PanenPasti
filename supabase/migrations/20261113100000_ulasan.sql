-- PanenPasti · migrasi 10: ulasan pembeli + balasan penjual
--
-- Satu ulasan per pesanan, hanya untuk pesanan Selesai, ditulis pembelinya.
-- Ulasan terlihat oleh semua pengguna yang login (pembeli lain & penjual).
-- Penjual pemilik listing boleh mengisi/mengubah kolom balasan saja.

create table public.ulasan (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  -- listing_id & penjual_id diisi trigger dari pesanannya.
  listing_id uuid not null references public.listings (id) on delete cascade,
  penjual_id uuid not null references public.profiles (id) on delete cascade,
  pembeli_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  bintang smallint not null check (bintang between 1 and 5),
  komentar text check (komentar is null or char_length(komentar) <= 500),
  balasan text check (balasan is null or char_length(balasan) <= 500),
  dibalas_pada timestamptz,
  dibuat_pada timestamptz not null default now()
);

create index ulasan_penjual_idx on public.ulasan (penjual_id, dibuat_pada desc);

create or replace function public.ulasan_sebelum_simpan()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_klien boolean := current_user in ('authenticated', 'anon');
  v_order record;
begin
  new.komentar := nullif(btrim(new.komentar), '');
  new.balasan := nullif(btrim(new.balasan), '');

  if tg_op = 'INSERT' then
    select o.pembeli_id, o.status, o.listing_id, l.penjual_id
      into v_order
      from public.orders o
      join public.listings l on l.id = o.listing_id
     where o.id = new.order_id;
    if not found then
      raise exception using errcode = 'PP404', message = 'Pesanan tidak ditemukan.';
    end if;

    new.listing_id := v_order.listing_id;
    new.penjual_id := v_order.penjual_id;

    if v_klien then
      if v_order.pembeli_id is distinct from auth.uid() then
        raise exception using errcode = 'PP403', message = 'Hanya pembeli pesanan ini yang bisa memberi ulasan.';
      end if;
      if v_order.status <> 'selesai' then
        raise exception using errcode = 'PP422', message = 'Ulasan bisa diberikan setelah pesanan selesai.';
      end if;
      new.pembeli_id := auth.uid();
      new.balasan := null;
      new.dibalas_pada := null;
      new.dibuat_pada := now();
    end if;
    return new;
  end if;

  -- UPDATE: klien (penjual, lewat policy di bawah) hanya mengubah balasan.
  if v_klien then
    new.id := old.id;
    new.order_id := old.order_id;
    new.listing_id := old.listing_id;
    new.penjual_id := old.penjual_id;
    new.pembeli_id := old.pembeli_id;
    new.bintang := old.bintang;
    new.komentar := old.komentar;
    new.dibuat_pada := old.dibuat_pada;
  end if;
  if new.balasan is distinct from old.balasan then
    new.dibalas_pada := case when new.balasan is null then null else now() end;
  end if;
  return new;
end;
$$;

create trigger ulasan_sebelum_simpan
  before insert or update on public.ulasan
  for each row execute function public.ulasan_sebelum_simpan();

alter table public.ulasan enable row level security;

create policy ulasan_baca_login on public.ulasan
  for select to authenticated using (true);

create policy ulasan_tambah_pembeli on public.ulasan
  for insert to authenticated
  with check (pembeli_id = (select auth.uid()));

create policy ulasan_balas_penjual on public.ulasan
  for update to authenticated
  using (penjual_id = (select auth.uid()))
  with check (penjual_id = (select auth.uid()));

revoke all on table public.ulasan from anon, authenticated;
grant select on table public.ulasan to authenticated;
grant insert (order_id, bintang, komentar) on table public.ulasan to authenticated;
grant update (balasan) on table public.ulasan to authenticated;
grant all on table public.ulasan to service_role;
revoke all on function public.ulasan_sebelum_simpan() from public, anon, authenticated;
