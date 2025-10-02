-- 1) Prereqs
create extension if not exists pgcrypto;

-- 2) Profiles table (idempotent)
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  tos_accepted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3) RLS on profiles
alter table public.profiles enable row level security;

-- Allow users to see/update their own profile
drop policy if exists "profiles self read" on public.profiles;
drop policy if exists "profiles self insert" on public.profiles;
drop policy if exists "profiles self update" on public.profiles;

create policy "profiles self read"
on public.profiles for select
using (auth.uid() = user_id);

create policy "profiles self insert"
on public.profiles for insert
with check (auth.uid() = user_id);

create policy "profiles self update"
on public.profiles for update
using (auth.uid() = user_id);

-- 4) Trigger function: create a profile row for brand-new users
-- IMPORTANT: security definer + search_path
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (user_id, email)
  values (new.id, new.email)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- optional hardening: keep it callable only by Postgres/auth system
revoke all on function public.handle_new_user() from public;
grant execute on function public.handle_new_user() to authenticated, anon;

-- 5) Recreate the auth.users trigger cleanly
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();