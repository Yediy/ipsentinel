-- IPGenie International — Supabase schema
-- Safe to run multiple times (guards for IF NOT EXISTS)

-- Extensions
create extension if not exists "uuid-ossp";

-- =========================
-- Helper: updated_at trigger
-- =========================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================
-- Helper: is_admin() for RLS
-- =========================
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'admin'
  );
$$;

-- Make callable by clients
grant execute on function public.is_admin() to authenticated, anon;

-- =========================
-- Enums
-- =========================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'filing_type') then
    create type public.filing_type as enum ('patent','trademark','copyright');
  end if;

  if not exists (select 1 from pg_type where typname = 'filing_route') then
    create type public.filing_route as enum ('national','pct','paris','madrid');
  end if;

  if not exists (select 1 from pg_type where typname = 'filing_status') then
    create type public.filing_status as enum ('draft','ready','submitted','filed','rejected');
  end if;

  if not exists (select 1 from pg_type where typname = 'mark_type') then
    create type public.mark_type as enum ('word','device','combined');
  end if;

  if not exists (select 1 from pg_type where typname = 'doc_kind') then
    create type public.doc_kind as enum ('pdf','docx','xml');
  end if;

  if not exists (select 1 from pg_type where typname = 'cn_type') then
    create type public.cn_type as enum ('invention','utility_model','design');
  end if;
end $$;

-- =========================
-- Tables
-- =========================

-- profiles - Update structure
do $$
begin
  -- Add new columns if they don't exist
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'full_name') then
    alter table public.profiles add column full_name text;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'role') then
    alter table public.profiles add column role text default 'user';
  end if;
end $$;

-- filings - Comprehensive update
do $$
begin
  -- Add new columns for international filing support
  if not exists (select 1 from information_schema.columns where table_name = 'filings' and column_name = 'route') then
    alter table public.filings add column route filing_route not null default 'national';
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name = 'filings' and column_name = 'country_code') then
    alter table public.filings add column country_code text not null default 'US';
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name = 'filings' and column_name = 'language') then
    alter table public.filings add column language text not null default 'en';
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name = 'filings' and column_name = 'needs_translation') then
    alter table public.filings add column needs_translation boolean not null default false;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name = 'filings' and column_name = 'translation_status') then
    alter table public.filings add column translation_status text not null default 'none';
  end if;
  
  -- Add priority and deadline columns
  if not exists (select 1 from information_schema.columns where table_name = 'filings' and column_name = 'priority_date') then
    alter table public.filings add column priority_date date;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name = 'filings' and column_name = 'pct_app_no') then
    alter table public.filings add column pct_app_no text;
  end if;
  
  -- Add agent columns
  if not exists (select 1 from information_schema.columns where table_name = 'filings' and column_name = 'agent_required') then
    alter table public.filings add column agent_required boolean not null default false;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name = 'filings' and column_name = 'agent_assigned') then
    alter table public.filings add column agent_assigned boolean not null default false;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name = 'filings' and column_name = 'agent_contact') then
    alter table public.filings add column agent_contact text;
  end if;
  
  -- Update type column to use enum if it exists as text
  if exists (select 1 from information_schema.columns where table_name = 'filings' and column_name = 'type' and data_type = 'text') then
    alter table public.filings alter column type type filing_type using type::filing_type;
  end if;
  
  -- Update status column to use enum if it exists as text
  if exists (select 1 from information_schema.columns where table_name = 'filings' and column_name = 'status' and data_type = 'text') then
    alter table public.filings alter column status type filing_status using 
      case 
        when status = 'draft' then 'draft'::filing_status
        when status = 'ready' then 'ready'::filing_status
        when status = 'submitted' then 'submitted'::filing_status
        when status = 'filed' then 'filed'::filing_status
        else 'draft'::filing_status
      end;
  end if;
end $$;

-- documents - Update structure
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'documents' and column_name = 'kind') then
    alter table public.documents add column kind doc_kind not null default 'pdf';
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name = 'documents' and column_name = 'url') then
    alter table public.documents add column url text not null default '';
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name = 'documents' and column_name = 'sha256') then
    alter table public.documents add column sha256 text;
  end if;
  
  -- Update existing file_url column to url if needed
  if exists (select 1 from information_schema.columns where table_name = 'documents' and column_name = 'file_url') then
    update public.documents set url = file_url where url = '' and file_url is not null;
    alter table public.documents drop column if exists file_url;
  end if;
  
  -- Update document_kind to kind if needed
  if exists (select 1 from information_schema.columns where table_name = 'documents' and column_name = 'document_kind') then
    update public.documents set kind = 
      case 
        when document_kind = 'pdf' then 'pdf'::doc_kind
        when document_kind = 'docx' then 'docx'::doc_kind
        when document_kind = 'xml' then 'xml'::doc_kind
        else 'pdf'::doc_kind
      end
    where kind = 'pdf';
    alter table public.documents drop column if exists document_kind;
  end if;
  
  -- Remove file_hash column if it exists (replaced by sha256)
  alter table public.documents drop column if exists file_hash;
end $$;

-- payments - Update structure to match new schema
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'payments' and column_name = 'provider') then
    alter table public.payments add column provider text not null default 'stripe';
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name = 'payments' and column_name = 'session_id') then
    alter table public.payments add column session_id text;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name = 'payments' and column_name = 'amount_cents') then
    alter table public.payments add column amount_cents int;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name = 'payments' and column_name = 'raw_payload') then
    alter table public.payments add column raw_payload jsonb;
  end if;
  
  -- Migrate existing data
  if exists (select 1 from information_schema.columns where table_name = 'payments' and column_name = 'amount') then
    update public.payments set amount_cents = amount where amount_cents is null;
    alter table public.payments drop column if exists amount;
  end if;
  
  if exists (select 1 from information_schema.columns where table_name = 'payments' and column_name = 'stripe_session_id') then
    update public.payments set session_id = stripe_session_id where session_id is null;
    alter table public.payments drop column if exists stripe_session_id;
  end if;
  
  -- Remove user_id column as payments will be linked via filing_id
  if exists (select 1 from information_schema.columns where table_name = 'payments' and column_name = 'user_id') then
    -- Make filing_id not null first if it isn't already
    update public.payments set filing_id = gen_random_uuid() where filing_id is null;
    alter table public.payments alter column filing_id set not null;
    alter table public.payments drop column user_id;
  end if;
  
  -- Remove plan column
  alter table public.payments drop column if exists plan;
end $$;

-- =========================
-- Indexes
-- =========================
create index if not exists idx_filings_user_id on public.filings(user_id);
create index if not exists idx_filings_country on public.filings(country_code);
create index if not exists idx_filings_status on public.filings(status);
create index if not exists idx_documents_filing_id on public.documents(filing_id);
create index if not exists idx_deadlines_filing_id on public.deadlines(filing_id);
create index if not exists idx_payments_filing_id on public.payments(filing_id);

-- Deduplicate documents per filing by file hash when present
do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'ux_documents_filing_sha256'
  ) then
    create unique index ux_documents_filing_sha256
      on public.documents(filing_id, sha256)
      where sha256 is not null;
  end if;
end $$;

-- =========================
-- Triggers
-- =========================
drop trigger if exists trg_filings_updated_at on public.filings;
create trigger trg_filings_updated_at
before update on public.filings
for each row
execute function public.set_updated_at();

-- =========================
-- Row Level Security - Clean slate
-- =========================

-- Drop existing policies to replace with new comprehensive ones
do $$
declare
    pol record;
begin
    -- Drop all existing policies on main tables
    for pol in select schemaname, tablename, policyname 
               from pg_policies 
               where schemaname = 'public' 
               and tablename in ('profiles', 'filings', 'documents', 'deadlines', 'payments')
    loop
        execute format('drop policy if exists %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    end loop;
end $$;

-- profiles policies
create policy profiles_select_self_or_admin on public.profiles
  for select using (user_id = auth.uid() or public.is_admin());

create policy profiles_insert_self on public.profiles
  for insert with check (user_id = auth.uid());

create policy profiles_update_self_or_admin on public.profiles
  for update using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy profiles_delete_admin on public.profiles
  for delete using (public.is_admin());

-- filings policies
create policy filings_select_owner_or_admin on public.filings
  for select using (user_id = auth.uid() or public.is_admin());

create policy filings_insert_owner on public.filings
  for insert with check (user_id = auth.uid());

create policy filings_update_owner_or_admin on public.filings
  for update using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy filings_delete_owner_or_admin on public.filings
  for delete using (user_id = auth.uid() or public.is_admin());

-- documents policies
create policy documents_select_owner_or_admin on public.documents
  for select using (
    exists (
      select 1 from public.filings f
      where f.id = documents.filing_id
        and (f.user_id = auth.uid() or public.is_admin())
    )
  );

create policy documents_insert_owner on public.documents
  for insert with check (
    exists (
      select 1 from public.filings f
      where f.id = documents.filing_id
        and f.user_id = auth.uid()
    )
  );

create policy documents_update_admin_only on public.documents
  for update using (public.is_admin())
  with check (public.is_admin());

create policy documents_delete_owner_or_admin on public.documents
  for delete using (
    exists (
      select 1 from public.filings f
      where f.id = documents.filing_id
        and (f.user_id = auth.uid() or public.is_admin())
    )
  );

-- deadlines policies
create policy deadlines_select_owner_or_admin on public.deadlines
  for select using (
    exists (
      select 1 from public.filings f
      where f.id = deadlines.filing_id
        and (f.user_id = auth.uid() or public.is_admin())
    )
  );

create policy deadlines_insert_owner on public.deadlines
  for insert with check (
    exists (
      select 1 from public.filings f
      where f.id = deadlines.filing_id
        and f.user_id = auth.uid()
    )
  );

create policy deadlines_update_owner_or_admin on public.deadlines
  for update using (
    exists (
      select 1 from public.filings f
      where f.id = deadlines.filing_id
        and (f.user_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.filings f
      where f.id = deadlines.filing_id
        and (f.user_id = auth.uid() or public.is_admin())
    )
  );

create policy deadlines_delete_owner_or_admin on public.deadlines
  for delete using (
    exists (
      select 1 from public.filings f
      where f.id = deadlines.filing_id
        and (f.user_id = auth.uid() or public.is_admin())
    )
  );

-- payments policies (secure: only via related filing ownership)
create policy payments_select_owner_or_admin on public.payments
  for select using (
    payments.filing_id is null
    or exists (
      select 1 from public.filings f
      where f.id = payments.filing_id
        and (f.user_id = auth.uid() or public.is_admin())
    )
  );

create policy payments_insert_authenticated on public.payments
  for insert with check (auth.uid() is not null);

create policy payments_update_admin_only on public.payments
  for update using (public.is_admin())
  with check (public.is_admin());

create policy payments_delete_admin_only on public.payments
  for delete using (public.is_admin());

-- =========================
-- Convenience View
-- =========================
create or replace view public.upcoming_deadlines as
select d.*, f.user_id, f.country_code, f.route, f.type
from public.deadlines d
join public.filings f on f.id = d.filing_id
where d.done = false
  and d.due_on >= (current_date)
order by d.due_on asc;

-- Grant basic privileges to roles (Supabase default roles)
grant usage on schema public to anon, authenticated;
grant select on public.upcoming_deadlines to anon, authenticated;

-- BACKFILL from filing_sections (if table exists)
do $$
begin
  if exists (select 1 from information_schema.tables where table_name='filing_sections') then
    -- abstract
    update filings f set abstract = s.content
      from (
        select filing_id, max(content) as content from filing_sections
        where section_key in ('abstract')
        group by filing_id
      ) s
      where f.id = s.filing_id and coalesce(f.abstract,'') = '';

    -- background
    update filings f set background = s.content
      from (
        select filing_id, max(content) as content from filing_sections
        where section_key in ('background')
        group by filing_id
      ) s
      where f.id = s.filing_id and coalesce(f.background,'') = '';

    -- summary
    update filings f set summary = s.content
      from (
        select filing_id, max(content) as content from filing_sections
        where section_key in ('summary')
        group by filing_id
      ) s
      where f.id = s.filing_id and coalesce(f.summary,'') = '';

    -- detailed_description
    update filings f set detailed_description = s.content
      from (
        select filing_id, string_agg(content, E'\n\n') as content
        from filing_sections
        where section_key in ('detailed_description', 'description')
        group by filing_id
      ) s
      where f.id = s.filing_id and coalesce(f.detailed_description,'') = '';

    -- claims (join lines)
    update filings f set claims = s.content
      from (
        select filing_id, string_agg(content, E'\n') as content
        from filing_sections
        where section_key='claims'
        group by filing_id
      ) s
      where f.id = s.filing_id and coalesce(f.claims,'') = '';

    -- features
    update filings f set features = s.content
      from (
        select filing_id, max(content) as content from filing_sections
        where section_key='features'
        group by filing_id
      ) s
      where f.id = s.filing_id and coalesce(f.features,'') = '';

    -- prior_art
    update filings f set prior_art = s.content
      from (
        select filing_id, max(content) as content from filing_sections
        where section_key='prior_art'
        group by filing_id
      ) s
      where f.id = s.filing_id and coalesce(f.prior_art,'') = '';
  end if;
end $$;