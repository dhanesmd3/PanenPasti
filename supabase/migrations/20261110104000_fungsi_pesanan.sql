-- PanenPasti · migrasi 5: fungsi pesanan (docs/PRD bagian 10)
--
--   buat_pesanan(listing, jumlah, kebutuhan?)  pembeli pre-order, stok dikunci
--   ubah_status(order, status_baru, alasan?)   perpindahan status + stok + notifikasi
--
-- Setiap fungsi berjalan dalam satu transaksi. Baris listing dikunci (FOR UPDATE)
-- sebelum stok dibaca, sehingga dua pesanan bersamaan diproses bergantian dan
-- stok tidak pernah minus. Urutan kunci selalu listing lalu order, supaya dua
-- transaksi tidak saling menunggu (deadlock).

create or replace function public.buat_pesanan(
  p_listing_id uuid,
  p_jumlah_kg numeric,
  p_kebutuhan_id uuid default null
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_peran text;
  v_nama_pembeli text;
  v_jumlah numeric(10, 2);
  v_listing public.listings%rowtype;
  v_komoditas text;
  v_harga integer;
  v_order public.orders%rowtype;
begin
  if v_uid is null then
    raise exception using errcode = 'PP401', message = 'Masuk terlebih dahulu.';
  end if;

  select p.peran, coalesce(p.nama_usaha, p.nama)
    into v_peran, v_nama_pembeli
  from public.profiles p
  where p.id = v_uid;

  if v_peran is distinct from 'pembeli' then
    raise exception using errcode = 'PP403', message = 'Hanya pembeli yang bisa membuat pesanan.';
  end if;

  if p_listing_id is null then
    raise exception using errcode = 'PP422', message = 'Panen yang dipesan wajib diisi.';
  end if;

  if p_jumlah_kg is null or p_jumlah_kg <= 0 or p_jumlah_kg > 100000 then
    raise exception using errcode = 'PP422', message = 'Jumlah pesanan harus lebih dari 0 kg.';
  end if;

  v_jumlah := round(p_jumlah_kg, 2);
  if v_jumlah <= 0 then
    raise exception using errcode = 'PP422', message = 'Jumlah pesanan paling sedikit 0,01 kg.';
  end if;

  select l.* into v_listing
  from public.listings l
  where l.id = p_listing_id
  for update;

  if not found then
    raise exception using errcode = 'PP404', message = 'Panen tidak ditemukan.';
  end if;

  if v_listing.status = 'habis' or v_listing.sisa_kg <= 0 then
    raise exception using errcode = 'PP409', message = 'Stok panen ini sudah habis.';
  end if;

  if v_listing.sisa_kg < v_jumlah then
    raise exception using errcode = 'PP409',
      message = format('Stok tidak cukup. Sisa stok %s kg.', public.format_kg(v_listing.sisa_kg));
  end if;

  if p_kebutuhan_id is not null and not exists (
    select 1 from public.kebutuhan k where k.id = p_kebutuhan_id and k.pembeli_id = v_uid
  ) then
    raise exception using errcode = 'PP422', message = 'Kebutuhan tidak ditemukan.';
  end if;

  v_harga := case
    when v_listing.is_surplus and v_listing.harga_surplus is not null then v_listing.harga_surplus
    else v_listing.harga_per_kg
  end;

  update public.listings
  set sisa_kg = sisa_kg - v_jumlah
  where id = v_listing.id;

  insert into public.orders (listing_id, pembeli_id, kebutuhan_id, jumlah_kg, harga_per_kg)
  values (v_listing.id, v_uid, p_kebutuhan_id, v_jumlah, v_harga)
  returning * into v_order;

  select lower(k.nama) into v_komoditas from public.komoditas k where k.id = v_listing.komoditas_id;

  insert into public.notifikasi (user_id, tipe, pesan, order_id, listing_id)
  values (
    v_listing.penjual_id,
    'pesanan_baru',
    format(
      'Pesanan baru dari %s: %s kg %s, panen %s.',
      v_nama_pembeli,
      public.format_kg(v_jumlah),
      v_komoditas,
      public.format_tanggal(v_listing.tgl_panen)
    ),
    v_order.id,
    v_listing.id
  );

  return v_order;
end;
$$;

revoke all on function public.buat_pesanan(uuid, numeric, uuid) from public, anon;
grant execute on function public.buat_pesanan(uuid, numeric, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- ubah_status
-- ---------------------------------------------------------------------------
--
--   dari          ke             pelaku    stok       catatan
--   menunggu      dikonfirmasi   penjual   -          kontak terbuka
--   menunggu      ditolak        penjual   kembali    alasan opsional
--   menunggu      dibatalkan     pembeli   kembali    alasan opsional
--   dikonfirmasi  dikirim        penjual   -
--   dikonfirmasi  gagal_panen    penjual   kembali    alasan wajib, saran pengganti
--   dikirim       selesai        pembeli   -
--
-- Setiap perpindahan membuat notifikasi untuk pihak lawan.

create or replace function public.label_status(p_status text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_status
    when 'menunggu' then 'Menunggu konfirmasi'
    when 'dikonfirmasi' then 'Dikonfirmasi'
    when 'dikirim' then 'Dikirim'
    when 'selesai' then 'Selesai'
    when 'ditolak' then 'Ditolak'
    when 'dibatalkan' then 'Dibatalkan'
    when 'gagal_panen' then 'Dibatalkan (gagal panen)'
    else p_status
  end;
$$;

revoke all on function public.label_status(text) from public, anon;
grant execute on function public.label_status(text) to authenticated, service_role;

create or replace function public.ubah_status(
  p_order_id uuid,
  p_status_baru text,
  p_alasan text default null
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_listing_id uuid;
  v_order public.orders%rowtype;
  v_listing public.listings%rowtype;
  v_alasan text := nullif(btrim(p_alasan), '');
  v_pelaku text;
  v_wajib text;
  v_kembalikan_stok boolean;
  v_nama_pembeli text;
  v_nama_penjual text;
  v_komoditas text;
  v_kg text;
  v_penerima uuid;
  v_pesan text;
  v_tgl_target date;
  v_pengganti integer;
begin
  if v_uid is null then
    raise exception using errcode = 'PP401', message = 'Masuk terlebih dahulu.';
  end if;

  if p_status_baru is null or p_status_baru not in (
    'menunggu', 'dikonfirmasi', 'dikirim', 'selesai', 'ditolak', 'dibatalkan', 'gagal_panen'
  ) then
    raise exception using errcode = 'PP422', message = 'Status pesanan tidak dikenal.';
  end if;

  if v_alasan is not null and char_length(v_alasan) > 300 then
    raise exception using errcode = 'PP422', message = 'Alasan paling panjang 300 karakter.';
  end if;

  select o.listing_id into v_listing_id from public.orders o where o.id = p_order_id;
  if not found then
    raise exception using errcode = 'PP404', message = 'Pesanan tidak ditemukan.';
  end if;

  select l.* into v_listing from public.listings l where l.id = v_listing_id for update;
  select o.* into v_order from public.orders o where o.id = p_order_id for update;
  if v_listing.id is null or v_order.id is null then
    raise exception using errcode = 'PP404', message = 'Pesanan tidak ditemukan.';
  end if;

  -- Orang di luar pesanan mendapat jawaban yang sama dengan pesanan yang tidak ada.
  if v_uid = v_order.pembeli_id then
    v_pelaku := 'pembeli';
  elsif v_uid = v_listing.penjual_id then
    v_pelaku := 'penjual';
  else
    raise exception using errcode = 'PP404', message = 'Pesanan tidak ditemukan.';
  end if;

  if v_order.status = p_status_baru then
    raise exception using errcode = 'PP409',
      message = format('Pesanan sudah berstatus %s.', public.label_status(v_order.status));
  end if;

  v_wajib := case
    when v_order.status = 'menunggu' and p_status_baru = 'dikonfirmasi' then 'penjual'
    when v_order.status = 'menunggu' and p_status_baru = 'ditolak' then 'penjual'
    when v_order.status = 'menunggu' and p_status_baru = 'dibatalkan' then 'pembeli'
    when v_order.status = 'dikonfirmasi' and p_status_baru = 'dikirim' then 'penjual'
    when v_order.status = 'dikonfirmasi' and p_status_baru = 'gagal_panen' then 'penjual'
    when v_order.status = 'dikirim' and p_status_baru = 'selesai' then 'pembeli'
    else null
  end;

  if v_wajib is null then
    raise exception using errcode = 'PP409',
      message = format(
        'Pesanan berstatus %s tidak bisa diubah menjadi %s.',
        public.label_status(v_order.status),
        public.label_status(p_status_baru)
      );
  end if;

  if v_pelaku <> v_wajib then
    raise exception using errcode = 'PP403',
      message = format('Hanya %s yang bisa melakukan ini.', v_wajib);
  end if;

  if p_status_baru = 'gagal_panen' and (v_alasan is null or char_length(v_alasan) < 3) then
    raise exception using errcode = 'PP422',
      message = 'Tulis alasan gagal panen supaya pembeli tahu penyebabnya.';
  end if;

  v_kembalikan_stok := p_status_baru in ('ditolak', 'dibatalkan', 'gagal_panen');

  update public.orders
  set status = p_status_baru,
      alasan_batal = case when v_kembalikan_stok then v_alasan else alasan_batal end,
      diubah_pada = now()
  where id = v_order.id
  returning * into v_order;

  if v_kembalikan_stok then
    update public.listings
    set sisa_kg = least(jumlah_kg, sisa_kg + v_order.jumlah_kg)
    where id = v_listing.id;
  end if;

  select coalesce(p.nama_usaha, p.nama) into v_nama_pembeli
  from public.profiles p where p.id = v_order.pembeli_id;
  select coalesce(p.nama_usaha, p.nama) into v_nama_penjual
  from public.profiles p where p.id = v_listing.penjual_id;
  select lower(k.nama) into v_komoditas
  from public.komoditas k where k.id = v_listing.komoditas_id;
  v_kg := public.format_kg(v_order.jumlah_kg);

  if p_status_baru = 'dikonfirmasi' then
    v_penerima := v_order.pembeli_id;
    v_pesan := format(
      '%s menerima pesanan %s kg %s Anda. Kontak penjual sekarang bisa dilihat.',
      v_nama_penjual, v_kg, v_komoditas
    );
  elsif p_status_baru = 'ditolak' then
    v_penerima := v_order.pembeli_id;
    v_pesan := format('%s menolak pesanan %s kg %s Anda.', v_nama_penjual, v_kg, v_komoditas)
      || coalesce(' Alasan: ' || v_alasan, '');
  elsif p_status_baru = 'dibatalkan' then
    v_penerima := v_listing.penjual_id;
    v_pesan := format(
      '%s membatalkan pesanan %s kg %s. Stok sudah dikembalikan.',
      v_nama_pembeli, v_kg, v_komoditas
    ) || coalesce(' Alasan: ' || v_alasan, '');
  elsif p_status_baru = 'dikirim' then
    v_penerima := v_order.pembeli_id;
    v_pesan := format('Pesanan %s kg %s dari %s sedang dikirim.', v_kg, v_komoditas, v_nama_penjual);
  elsif p_status_baru = 'gagal_panen' then
    v_penerima := v_order.pembeli_id;
    v_pesan := format(
      '%s membatalkan pesanan %s kg %s karena gagal panen. Alasan: %s',
      v_nama_penjual, v_kg, v_komoditas, v_alasan
    );
  else
    v_penerima := v_listing.penjual_id;
    v_pesan := format(
      '%s sudah menerima pesanan %s kg %s. Pesanan selesai.',
      v_nama_pembeli, v_kg, v_komoditas
    );
  end if;

  insert into public.notifikasi (user_id, tipe, pesan, order_id, listing_id)
  values (v_penerima, 'status_berubah', left(v_pesan, 500), v_order.id, v_listing.id);

  -- Gagal panen: beri tahu pembeli kalau ada penjual lain yang panen di sekitar
  -- tanggal yang sama. Syaratnya sama dengan filter matching (PRD 9.1): komoditas
  -- sama, masih ada stok, selisih tanggal paling banyak 7 hari. Peringkat dan
  -- skornya dihitung /api/match saat pembeli membuka pesanan.
  if p_status_baru = 'gagal_panen' then
    select k.tgl_butuh into v_tgl_target from public.kebutuhan k where k.id = v_order.kebutuhan_id;
    v_tgl_target := coalesce(v_tgl_target, v_listing.tgl_panen);

    select count(*) into v_pengganti
    from public.listings l
    where l.komoditas_id = v_listing.komoditas_id
      and l.id <> v_listing.id
      and l.penjual_id <> v_listing.penjual_id
      and l.status <> 'habis'
      and l.sisa_kg > 0
      and abs(l.tgl_panen - v_tgl_target) <= 7;

    if v_pengganti > 0 then
      insert into public.notifikasi (user_id, tipe, pesan, order_id, listing_id)
      values (
        v_order.pembeli_id,
        'pengganti_tersedia',
        format(
          'Ada penjual lain yang panen di sekitar %s. Buka pesanan untuk melihat penjual pengganti.',
          public.format_tanggal(v_tgl_target)
        ),
        v_order.id,
        v_listing.id
      );
    end if;
  end if;

  return v_order;
end;
$$;

revoke all on function public.ubah_status(uuid, text, text) from public, anon;
grant execute on function public.ubah_status(uuid, text, text) to authenticated, service_role;
