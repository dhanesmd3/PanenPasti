-- PanenPasti · migrasi 8: pesanan batal otomatis setelah 48 jam (P1, PRD bagian 10)
--
-- Pesanan yang masih Menunggu konfirmasi lebih dari 48 jam dibatalkan: stok
-- kembali, kedua pihak diberi tahu. Fungsi ini tidak menerima masukan, jadi aman
-- dipanggil pengguna mana pun. Route handler memanggilnya sebelum membaca atau
-- mengubah pesanan, sehingga tidak butuh penjadwal.
--
-- Kalau ingin dijalankan terjadwal di Supabase (opsional), aktifkan ekstensi
-- pg_cron lalu jalankan sekali di SQL Editor:
--
--   select cron.schedule('batal-otomatis-48-jam', '*/15 * * * *',
--     $cron$ select public.batalkan_pesanan_kedaluwarsa(); $cron$);

create or replace function public.batalkan_pesanan_kedaluwarsa()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_calon record;
  v_order public.orders%rowtype;
  v_listing public.listings%rowtype;
  v_nama_pembeli text;
  v_komoditas text;
  v_kg text;
  v_jumlah integer := 0;
begin
  for v_calon in
    select o.id, o.listing_id
    from public.orders o
    where o.status = 'menunggu'
      and o.dibuat_pada < now() - interval '48 hours'
    order by o.listing_id, o.dibuat_pada
  loop
    -- Urutan kunci sama dengan ubah_status: listing lalu order.
    select l.* into v_listing from public.listings l where l.id = v_calon.listing_id for update;
    select o.* into v_order
    from public.orders o
    where o.id = v_calon.id and o.status = 'menunggu'
    for update;

    -- Sudah diproses transaksi lain selagi menunggu kunci.
    if not found then
      continue;
    end if;

    update public.orders
    set status = 'dibatalkan',
        alasan_batal = 'Batal otomatis: tidak dikonfirmasi penjual dalam 48 jam.',
        diubah_pada = now()
    where id = v_order.id;

    update public.listings
    set sisa_kg = least(jumlah_kg, sisa_kg + v_order.jumlah_kg)
    where id = v_listing.id;

    select coalesce(p.nama_usaha, p.nama) into v_nama_pembeli
    from public.profiles p where p.id = v_order.pembeli_id;
    select lower(k.nama) into v_komoditas
    from public.komoditas k where k.id = v_listing.komoditas_id;
    v_kg := public.format_kg(v_order.jumlah_kg);

    insert into public.notifikasi (user_id, tipe, pesan, order_id, listing_id)
    values
      (
        v_order.pembeli_id,
        'status_berubah',
        format(
          'Pesanan %s kg %s batal otomatis karena tidak dikonfirmasi penjual dalam 48 jam.',
          v_kg, v_komoditas
        ),
        v_order.id,
        v_listing.id
      ),
      (
        v_listing.penjual_id,
        'status_berubah',
        format(
          'Pesanan %s kg %s dari %s batal otomatis karena tidak dikonfirmasi dalam 48 jam. Stok sudah dikembalikan.',
          v_kg, v_komoditas, v_nama_pembeli
        ),
        v_order.id,
        v_listing.id
      );

    v_jumlah := v_jumlah + 1;
  end loop;

  return v_jumlah;
end;
$$;

revoke all on function public.batalkan_pesanan_kedaluwarsa() from public, anon;
grant execute on function public.batalkan_pesanan_kedaluwarsa() to authenticated, service_role;
