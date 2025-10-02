-- ===== Admin Users Table =====
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admin_users enable row level security;

create policy "admin_users only admin read" on public.admin_users
for select to authenticated using (
  exists (select 1 from public.admin_users au where au.user_id = auth.uid())
);

-- Admin check function
create or replace function public.is_admin() returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

-- ===== Settings Table =====
create table if not exists public.settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);
alter table public.settings enable row level security;

create policy "settings admin only" on public.settings 
for all to authenticated
using (public.is_admin()) 
with check (public.is_admin());

-- ===== Audit Log =====
create table if not exists public.audit_log (
  id bigserial primary key,
  user_id uuid references auth.users(id),
  action text not null,
  subject_type text,
  subject_id text,
  metadata jsonb default '{}'::jsonb,
  ip text,
  user_agent text,
  created_at timestamptz default now()
);
alter table public.audit_log enable row level security;

create policy "audit admin only" on public.audit_log 
for select to authenticated
using (public.is_admin());

create index if not exists audit_action_idx on public.audit_log(action, created_at desc);
create index if not exists audit_user_idx on public.audit_log(user_id, created_at desc);

-- ===== Add indexes for performance =====
create index if not exists filings_user_idx on public.filings(user_id);
create index if not exists documents_filing_idx on public.documents(filing_id);
create index if not exists deadlines_user_due_idx on public.upcoming_deadlines(user_id, due_on);
create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);