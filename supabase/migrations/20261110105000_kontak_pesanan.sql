-- PanenPasti · migrasi 6: kontak pihak lawan (PRD bagian 10 dan 12)
--
-- Nomor HP hanya terbuka untuk pihak lawan selama pesanan berstatus
-- Dikonfirmasi, Dikirim, atau Selesai. Sebelum dikonfirmasi, dan setelah pesanan
-- batal, fungsi ini tidak mengembalikan apa pun untuk pesanan tersebut.
--
--   kontak_pesanan()          semua pesanan saya yang kontaknya terbuka
--   kontak_pesanan(order_id)  satu pesanan
--
-- Tautan WhatsApp dibentuk di klien: https://wa.me/<no_hp>

create or replace function public.kontak_pesanan(p_order_id uuid default null)
returns table (
  order_id uuid,
  user_id uuid,
  peran text,
  nama text,
  nama_usaha text,
  no_hp text
)
language sql
stable
security definer
set search_path = ''
as $$
  select o.id, p.id, p.peran, p.nama, p.nama_usaha, p.no_hp
  from public.orders o
  join public.listings l on l.id = o.listing_id
  join public.profiles p
    on p.id = case when o.pembeli_id = auth.uid() then l.penjual_id else o.pembeli_id end
  where (o.pembeli_id = auth.uid() or l.penjual_id = auth.uid())
    and o.status in ('dikonfirmasi', 'dikirim', 'selesai')
    and (p_order_id is null or o.id = p_order_id);
$$;

revoke all on function public.kontak_pesanan(uuid) from public, anon;
grant execute on function public.kontak_pesanan(uuid) to authenticated, service_role;
