-- Tiruan bagian Supabase yang dipakai migrasi, untuk pengujian di Postgres polos
-- (PGlite). BUKAN migrasi dan tidak pernah dijalankan di Supabase.
--
-- Yang ditiru: role anon/authenticated/service_role, skema auth (users, uid()),
-- skema storage (buckets, objects, foldername), dan default privileges Supabase
-- yang memberi semua hak ke anon/authenticated untuk tabel dan fungsi baru.
-- Default privileges sengaja ditiru supaya test membuktikan bahwa revoke di
-- migrasi benar-benar menutup akses.

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
-- Role yang dipakai Supabase Auth (GoTrue) untuk menulis auth.users. Tidak punya
-- hak apa pun di skema public.
create role supabase_auth_admin nologin;

create schema auth;

create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb,
  raw_app_meta_data jsonb,
  created_at timestamptz not null default now()
);

-- Sama dengan auth.uid() milik Supabase: membaca klaim JWT yang dipasang PostgREST.
create function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(
    coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
    ),
    ''
  )::uuid;
$$;

create schema storage;

create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text not null,
  owner uuid
);

alter table storage.objects enable row level security;

create function storage.foldername(name text)
returns text[]
language sql
immutable
as $$
  select (string_to_array(name, '/'))[1 : array_length(string_to_array(name, '/'), 1) - 1];
$$;

grant usage on schema public, auth, storage to anon, authenticated, service_role;
grant usage on schema auth to supabase_auth_admin;
grant all on auth.users to supabase_auth_admin;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant execute on function storage.foldername(text) to anon, authenticated, service_role;
grant all on storage.objects, storage.buckets to authenticated, service_role;

alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
