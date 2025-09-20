-- =========================
-- Extensions
-- =========================
create extension if not exists "uuid-ossp";

-- =========================
-- Helper: updated_at
-- =========================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- =========================
-- Enums (if missing)
-- =========================
do $$
begin
  if not exists (select 1 from pg_type where typname='filing_status') then
    create type public.filing_status as enum ('draft','ready','submitted','filed','rejected');
  end if;
  if not exists (select 1 from pg_type where typname='doc_kind') then
    create type public.doc_kind as enum ('pdf','docx','xml');
  end if;
end $$;

-- =========================
-- profiles (if missing)
-- =========================
create table if not exists public.profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid unique not null,
  full_name text,
  role text default 'user',
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- admin helper
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles p where p.user_id = auth.uid() and p.role='admin')
$$;
grant execute on function public.is_admin() to authenticated, anon;

-- RLS for profiles
do $$
begin
  if not exists (select 1 from pg_policies where policyname='profiles_select_self_or_admin') then
    create policy profiles_select_self_or_admin on public.profiles
      for select using (user_id = auth.uid() or public.is_admin());
  end if;
  if not exists (select 1 from pg_policies where policyname='profiles_insert_self') then
    create policy profiles_insert_self on public.profiles
      for insert with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where policyname='profiles_update_self_or_admin') then
    create policy profiles_update_self_or_admin on public.profiles
      for update using (user_id = auth.uid() or public.is_admin())
      with check (user_id = auth.uid() or public.is_admin());
  end if;
end $$;

-- =========================
-- filings (if missing minimal)
-- =========================
create table if not exists public.filings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  type text not null default 'patent', -- patent | trademark | copyright
  route text not null default 'national', -- national | pct | paris | madrid
  country_code text not null default 'US',
  title text,
  abstract text,
  detailed_description text,
  claims text,
  status filing_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.filings enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname='filings_select_owner_or_admin') then
    create policy filings_select_owner_or_admin on public.filings
      for select using (user_id = auth.uid() or public.is_admin());
  end if;
  if not exists (select 1 from pg_policies where policyname='filings_insert_owner') then
    create policy filings_insert_owner on public.filings
      for insert with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where policyname='filings_update_owner_or_admin') then
    create policy filings_update_owner_or_admin on public.filings
      for update using (user_id = auth.uid() or public.is_admin())
      with check (user_id = auth.uid() or public.is_admin());
  end if;
end $$;

drop trigger if exists trg_filings_updated_at on public.filings;
create trigger trg_filings_updated_at
before update on public.filings
for each row execute function public.set_updated_at();

create index if not exists idx_filings_user on public.filings(user_id);

-- =========================
-- documents (aka filing_documents compatibility)
-- =========================
create table if not exists public.documents (
  id uuid primary key default uuid_generate_v4(),
  filing_id uuid not null references public.filings(id) on delete cascade,
  kind doc_kind not null default 'pdf',
  url text not null,
  sha256 text,
  created_at timestamptz not null default now()
);
alter table public.documents enable row level security;
create index if not exists idx_documents_filing_id on public.documents(filing_id);

do $$
begin
  if not exists (select 1 from pg_policies where policyname='documents_select_owner_or_admin') then
    create policy documents_select_owner_or_admin on public.documents
      for select using (
        exists(select 1 from public.filings f where f.id=documents.filing_id and (f.user_id=auth.uid() or public.is_admin()))
      );
  end if;
  if not exists (select 1 from pg_policies where policyname='documents_insert_owner') then
    create policy documents_insert_owner on public.documents
      for insert with check (
        exists(select 1 from public.filings f where f.id=documents.filing_id and f.user_id=auth.uid())
      );
  end if;
end $$;

-- alias view for legacy references
drop view if exists public.filing_documents;
create view public.filing_documents as
  select id, filing_id, kind, url, sha256, created_at from public.documents;

-- =========================
-- deadlines + upcoming_deadlines (as TABLE to satisfy RLS check)
-- =========================
create table if not exists public.deadlines (
  id uuid primary key default uuid_generate_v4(),
  filing_id uuid not null references public.filings(id) on delete cascade,
  label text not null,
  due_on date not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.deadlines enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname='deadlines_select_owner_or_admin') then
    create policy deadlines_select_owner_or_admin on public.deadlines
      for select using (
        exists(select 1 from public.filings f where f.id=deadlines.filing_id and (f.user_id=auth.uid() or public.is_admin()))
      );
  end if;
  if not exists (select 1 from pg_policies where policyname='deadlines_insert_owner') then
    create policy deadlines_insert_owner on public.deadlines
      for insert with check (
        exists(select 1 from public.filings f where f.id=deadlines.filing_id and f.user_id=auth.uid())
      );
  end if;
  if not exists (select 1 from pg_policies where policyname='deadlines_update_owner_or_admin') then
    create policy deadlines_update_owner_or_admin on public.deadlines
      for update using (
        exists(select 1 from public.filings f where f.id=deadlines.filing_id and (f.user_id=auth.uid() or public.is_admin()))
      )
      with check (
        exists(select 1 from public.filings f where f.id=deadlines.filing_id and (f.user_id=auth.uid() or public.is_admin()))
      );
  end if;
end $$;

-- MATERIAL table that mirrors "upcoming" rows, to satisfy "RLS required"
create table if not exists public.upcoming_deadlines (
  id uuid primary key default uuid_generate_v4(),
  filing_id uuid not null references public.filings(id) on delete cascade,
  label text not null,
  due_on date not null,
  done boolean not null default false,
  user_id uuid not null,
  country_code text,
  route text,
  filing_type text,
  refreshed_at timestamptz not null default now()
);
alter table public.upcoming_deadlines enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname='upcoming_select_owner_or_admin') then
    create policy upcoming_select_owner_or_admin on public.upcoming_deadlines
      for select using (user_id = auth.uid() or public.is_admin());
  end if;
  if not exists (select 1 from pg_policies where policyname='upcoming_insert_admin_only') then
    create policy upcoming_insert_admin_only on public.upcoming_deadlines
      for insert with check (public.is_admin());
  end if;
  if not exists (select 1 from pg_policies where policyname='upcoming_update_admin_only') then
    create policy upcoming_update_admin_only on public.upcoming_deadlines
      for update using (public.is_admin()) with check (public.is_admin());
  end if;
  if not exists (select 1 from pg_policies where policyname='upcoming_delete_admin_only') then
    create policy upcoming_delete_admin_only on public.upcoming_deadlines
      for delete using (public.is_admin());
  end if;
end $$;

-- refresh helper
create or replace function public.refresh_upcoming_deadlines(_filing_id uuid default null)
returns void language sql as $$
  -- blow away and reinsert relevant rows
  with target as (
    select d.id as did, f.id as fid
    from public.deadlines d join public.filings f on f.id=d.filing_id
    where (_filing_id is null or f.id=_filing_id) and d.done=false and d.due_on >= current_date
  )
  delete from public.upcoming_deadlines u
  using target t
  where u.filing_id = t.fid;

  insert into public.upcoming_deadlines (id, filing_id, label, due_on, done, user_id, country_code, route, filing_type, refreshed_at)
  select uuid_generate_v4(), f.id, d.label, d.due_on, d.done, f.user_id, f.country_code, f.route, f.type, now()
  from public.deadlines d
  join public.filings f on f.id = d.filing_id
  where (_filing_id is null or f.id=_filing_id)
    and d.done=false and d.due_on >= current_date;
$$;

-- triggers to keep upcoming_deadlines fresh
create or replace function public.on_deadlines_change()
returns trigger language plpgsql as $$
begin
  perform public.refresh_upcoming_deadlines(new.filing_id);
  return new;
end $$;

drop trigger if exists trg_deadlines_change on public.deadlines;
create trigger trg_deadlines_change
after insert or update or delete on public.deadlines
for each row execute function public.on_deadlines_change();

-- initial populate
select public.refresh_upcoming_deadlines(null);

-- =========================
-- filing_queue (for webhooks/jobs)
-- =========================
create table if not exists public.filing_queue (
  id uuid primary key default uuid_generate_v4(),
  filing_id uuid references public.filings(id) on delete cascade,
  job_type text not null,       -- e.g., 'generate_pdf','drawings_pack','translate','tm_search'
  status text not null default 'pending', -- pending|processing|done|failed
  payload jsonb,
  attempts int not null default 0,
  next_run_at timestamptz default now(),
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.filing_queue enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname='queue_select_owner_or_admin') then
    create policy queue_select_owner_or_admin on public.filing_queue
      for select using (
        filing_id is null or exists(select 1 from public.filings f where f.id=filing_queue.filing_id and (f.user_id=auth.uid() or public.is_admin()))
      );
  end if;
  if not exists (select 1 from pg_policies where policyname='queue_insert_owner') then
    create policy queue_insert_owner on public.filing_queue
      for insert with check (
        filing_id is null or exists(select 1 from public.filings f where f.id=filing_queue.filing_id and f.user_id=auth.uid())
      );
  end if;
end $$;

drop trigger if exists trg_queue_updated_at on public.filing_queue;
create trigger trg_queue_updated_at
before update on public.filing_queue
for each row execute function public.set_updated_at();

-- =========================
-- notifications
-- =========================
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  kind text not null default 'info',
  title text not null,
  body text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname='notif_select_self') then
    create policy notif_select_self on public.notifications
      for select using (user_id = auth.uid() or public.is_admin());
  end if;
  if not exists (select 1 from pg_policies where policyname='notif_insert_self_or_admin') then
    create policy notif_insert_self_or_admin on public.notifications
      for insert with check (user_id = auth.uid() or public.is_admin());
  end if;
  if not exists (select 1 from pg_policies where policyname='notif_update_self_or_admin') then
    create policy notif_update_self_or_admin on public.notifications
      for update using (user_id = auth.uid() or public.is_admin())
      with check (user_id = auth.uid() or public.is_admin());
  end if;
end $$;