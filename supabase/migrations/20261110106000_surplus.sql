-- PanenPasti · migrasi 7: alert surplus (F8)
--
--   tandai_surplus(listing, harga)  penjual memberi harga khusus + pembeli diberi tahu
--   batal_surplus(listing)          tanda surplus dilepas
--
-- Siapa yang diberi tahu: pembeli yang kecamatannya berada di kabupaten/kota yang
-- sama dengan penjual, ATAU berjarak paling jauh 100 km dari kecamatan penjual.
-- PRD menulis "pembeli di kabupaten yang sama", tetapi di MVP penjual ada di
-- Kab. Garut dan pembeli di Kota Bandung, sehingga aturan itu sendirian tidak
-- akan mengirim notifikasi ke siapa pun. Batas 100 km sama dengan batas jarak
-- matching (PRD 9.1, lib/matching.ts MAKS_JARAK_KM).

create or replace function public.tandai_surplus(p_listing_id uuid, p_harga_surplus integer)
returns public.listings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_listing public.listings%rowtype;
  v_nama_penjual text;
  v_kab_kota text;
  v_lat double precision;
  v_lng double precision;
  v_komoditas text;
  v_berubah boolean;
begin
  if v_uid is null then
    raise exception using errcode = 'PP401', message = 'Masuk terlebih dahulu.';
  end if;

  select l.* into v_listing from public.listings l where l.id = p_listing_id for update;
  if not found or v_listing.penjual_id <> v_uid then
    raise exception using errcode = 'PP404', message = 'Panen tidak ditemukan.';
  end if;

  if v_listing.status = 'habis' or v_listing.sisa_kg <= 0 then
    raise exception using errcode = 'PP409',
      message = 'Stok panen ini sudah habis, jadi tidak bisa ditandai surplus.';
  end if;

  if p_harga_surplus is null or p_harga_surplus < 100 then
    raise exception using errcode = 'PP422', message = 'Harga surplus paling rendah Rp100/kg.';
  end if;

  if p_harga_surplus >= v_listing.harga_per_kg then
    raise exception using errcode = 'PP422',
      message = format(
        'Harga surplus harus lebih rendah dari harga normal (%s/kg).',
        public.format_rupiah(v_listing.harga_per_kg)
      );
  end if;

  select coalesce(p.nama_usaha, p.nama), k.kab_kota, k.lat, k.lng
    into v_nama_penjual, v_kab_kota, v_lat, v_lng
  from public.profiles p
  left join public.kecamatan k on k.id = p.kecamatan_id
  where p.id = v_uid;

  if v_lat is null then
    raise exception using errcode = 'PP422',
      message = 'Lengkapi kecamatan di profil sebelum menandai surplus.';
  end if;

  v_berubah := (not v_listing.is_surplus) or v_listing.harga_surplus is distinct from p_harga_surplus;

  update public.listings
  set is_surplus = true,
      harga_surplus = p_harga_surplus
  where id = v_listing.id
  returning * into v_listing;

  if v_berubah then
    select lower(k.nama) into v_komoditas from public.komoditas k where k.id = v_listing.komoditas_id;

    -- Harga berubah: notifikasi lama yang belum dibaca diganti, supaya pembeli
    -- tidak menerima dua harga untuk listing yang sama.
    delete from public.notifikasi n
    where n.listing_id = v_listing.id and n.tipe = 'surplus' and not n.dibaca;

    insert into public.notifikasi (user_id, tipe, pesan, listing_id)
    select
      p.id,
      'surplus',
      format(
        'Panen surplus dari %s: %s kg %s seharga %s/kg (harga normal %s/kg), panen %s.',
        v_nama_penjual,
        public.format_kg(v_listing.sisa_kg),
        v_komoditas,
        public.format_rupiah(v_listing.harga_surplus),
        public.format_rupiah(v_listing.harga_per_kg),
        public.format_tanggal(v_listing.tgl_panen)
      ),
      v_listing.id
    from public.profiles p
    join public.kecamatan k on k.id = p.kecamatan_id
    where p.peran = 'pembeli'
      and (
        k.kab_kota = v_kab_kota
        or public.jarak_km(v_lat, v_lng, k.lat, k.lng) <= 100
      );
  end if;

  return v_listing;
end;
$$;

create or replace function public.batal_surplus(p_listing_id uuid)
returns public.listings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_listing public.listings%rowtype;
begin
  if v_uid is null then
    raise exception using errcode = 'PP401', message = 'Masuk terlebih dahulu.';
  end if;

  select l.* into v_listing from public.listings l where l.id = p_listing_id for update;
  if not found or v_listing.penjual_id <> v_uid then
    raise exception using errcode = 'PP404', message = 'Panen tidak ditemukan.';
  end if;

  if v_listing.is_surplus then
    update public.listings
    set is_surplus = false,
        harga_surplus = null
    where id = v_listing.id
    returning * into v_listing;

    -- Tawaran sudah tidak berlaku: notifikasi yang belum dibaca ditarik.
    delete from public.notifikasi n
    where n.listing_id = v_listing.id and n.tipe = 'surplus' and not n.dibaca;
  end if;

  return v_listing;
end;
$$;

revoke all on function public.tandai_surplus(uuid, integer) from public, anon;
revoke all on function public.batal_surplus(uuid) from public, anon;
grant execute on function public.tandai_surplus(uuid, integer) to authenticated, service_role;
grant execute on function public.batal_surplus(uuid) to authenticated, service_role;
