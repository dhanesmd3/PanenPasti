-- PanenPasti · migrasi 3: profil otomatis saat akun dibuat
--
-- Saat daftar, klien mengirim data profil sebagai metadata pengguna:
--
--   supabase.auth.signUp({
--     email, password,
--     options: { data: { peran, nama, nama_usaha, kecamatan_id, no_hp } },
--   })
--
-- Trigger di bawah menyalinnya ke public.profiles. Setelah itu sumber kebenaran
-- peran adalah profiles.peran. Metadata pengguna bisa diubah sendiri oleh
-- pengguna lewat auth.updateUser, jadi tidak pernah dipakai untuk otorisasi.

create or replace function public.buat_profil_pengguna_baru()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_peran text := lower(btrim(v_meta ->> 'peran'));
  v_nama text := nullif(btrim(v_meta ->> 'nama'), '');
  v_usaha text := nullif(btrim(v_meta ->> 'nama_usaha'), '');
  v_kec_teks text := btrim(v_meta ->> 'kecamatan_id');
  v_kecamatan integer;
  v_hp text := public.normalisasi_no_hp(v_meta ->> 'no_hp');
begin
  if v_peran is null or v_peran not in ('penjual', 'pembeli') then
    raise exception using errcode = 'PP422',
      message = 'Peran wajib diisi: penjual atau pembeli.';
  end if;

  if v_nama is null then
    v_nama := coalesce(nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'Pengguna');
  end if;

  -- Kecamatan dan nomor HP yang tidak valid dikosongkan, bukan menggagalkan
  -- pendaftaran. Pengguna melengkapinya di halaman profil.
  if v_kec_teks ~ '^[0-9]{1,9}$' then
    select k.id into v_kecamatan from public.kecamatan k where k.id = v_kec_teks::integer;
  end if;

  if v_hp is not null and v_hp !~ '^62[0-9]{8,13}$' then
    v_hp := null;
  end if;

  insert into public.profiles (id, peran, nama, nama_usaha, kecamatan_id, no_hp)
  values (new.id, v_peran, left(v_nama, 80), left(v_usaha, 120), v_kecamatan, v_hp)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists buat_profil_pengguna_baru on auth.users;

create trigger buat_profil_pengguna_baru
  after insert on auth.users
  for each row execute function public.buat_profil_pengguna_baru();

revoke all on function public.buat_profil_pengguna_baru() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Profil sendiri, lengkap dengan no_hp
-- ---------------------------------------------------------------------------
-- Kolom no_hp tidak bisa di-select klien, jadi profil sendiri dibaca lewat
-- fungsi ini. Mengembalikan nol baris jika belum login.

create or replace function public.profil_saya()
returns setof public.profiles
language sql
stable
security definer
set search_path = ''
as $$
  select p.* from public.profiles p where p.id = auth.uid();
$$;

revoke all on function public.profil_saya() from public, anon;
grant execute on function public.profil_saya() to authenticated, service_role;
