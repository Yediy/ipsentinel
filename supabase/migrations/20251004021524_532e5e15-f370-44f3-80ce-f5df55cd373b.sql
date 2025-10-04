-- ===============================
-- RLS_PERF_CLEAN_2025_10_02.sql
-- ===============================

-- 0) Helper: use SELECT auth.uid() everywhere in RLS for initplan optimization

-- ---------- FILINGS ----------
drop policy if exists "filings_select_owner_or_admin" on public.filings;
drop policy if exists "filings_insert_owner" on public.filings;
drop policy if exists "filings_update_owner_or_admin" on public.filings;
drop policy if exists "filings_delete_owner_or_admin" on public.filings;
drop policy if exists "filings_block_anon" on public.filings;

create policy "filings_select_owner_or_admin"
on public.filings
for select to authenticated
using (
  user_id = (select auth.uid())
  or public.has_role((select auth.uid()), 'admin')
);

create policy "filings_insert_owner"
on public.filings
for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "filings_update_owner_or_admin"
on public.filings
for update to authenticated
using (
  user_id = (select auth.uid())
  or public.has_role((select auth.uid()), 'admin')
)
with check (
  user_id = (select auth.uid())
  or public.has_role((select auth.uid()), 'admin')
);

create policy "filings_delete_owner_or_admin"
on public.filings
for delete to authenticated
using (
  user_id = (select auth.uid())
  or public.has_role((select auth.uid()), 'admin')
);

create policy "filings_block_anon"
on public.filings
for all to anon
using (false) with check (false);

-- ---------- DOCUMENTS ----------
drop policy if exists "documents_select_owner_or_admin" on public.documents;
drop policy if exists "documents_insert_owner" on public.documents;
drop policy if exists "documents_update_admin_only" on public.documents;
drop policy if exists "documents_delete_owner_or_admin" on public.documents;
drop policy if exists "documents_block_anon" on public.documents;

create policy "documents_select_owner_or_admin"
on public.documents
for select to authenticated
using (
  exists (
    select 1 from public.filings f
    where f.id = documents.filing_id
    and (
      f.user_id = (select auth.uid())
      or public.has_role((select auth.uid()), 'admin')
    )
  )
);

create policy "documents_insert_owner"
on public.documents
for insert to authenticated
with check (
  exists (
    select 1 from public.filings f
    where f.id = documents.filing_id
    and f.user_id = (select auth.uid())
  )
);

create policy "documents_update_admin_only"
on public.documents
for update to authenticated
using (public.has_role((select auth.uid()), 'admin'))
with check (public.has_role((select auth.uid()), 'admin'));

create policy "documents_delete_owner_or_admin"
on public.documents
for delete to authenticated
using (
  exists (
    select 1 from public.filings f
    where f.id = documents.filing_id
    and (
      f.user_id = (select auth.uid())
      or public.has_role((select auth.uid()), 'admin')
    )
  )
);

create policy "documents_block_anon"
on public.documents
for all to anon
using (false) with check (false);

-- ---------- FILING_DOCUMENTS ----------
drop policy if exists "filing_documents_select_owner_or_admin" on public.filing_documents;
drop policy if exists "filing_documents_insert_owner" on public.filing_documents;
drop policy if exists "filing_documents_update_admin_only" on public.filing_documents;
drop policy if exists "filing_documents_delete_owner_or_admin" on public.filing_documents;
drop policy if exists "filing_documents_block_anon" on public.filing_documents;

create policy "filing_documents_select_owner_or_admin"
on public.filing_documents
for select to authenticated
using (
  exists (
    select 1 from public.filings f
    where f.id = filing_documents.filing_id
    and (
      f.user_id = (select auth.uid())
      or public.has_role((select auth.uid()), 'admin')
    )
  )
);

create policy "filing_documents_insert_owner"
on public.filing_documents
for insert to authenticated
with check (
  exists (
    select 1 from public.filings f
    where f.id = filing_documents.filing_id
    and f.user_id = (select auth.uid())
  )
);

create policy "filing_documents_update_admin_only"
on public.filing_documents
for update to authenticated
using (public.has_role((select auth.uid()), 'admin'))
with check (public.has_role((select auth.uid()), 'admin'));

create policy "filing_documents_delete_owner_or_admin"
on public.filing_documents
for delete to authenticated
using (
  exists (
    select 1 from public.filings f
    where f.id = filing_documents.filing_id
    and (
      f.user_id = (select auth.uid())
      or public.has_role((select auth.uid()), 'admin')
    )
  )
);

create policy "filing_documents_block_anon"
on public.filing_documents
for all to anon
using (false) with check (false);

-- ---------- PAYMENTS ----------
drop policy if exists "payments_select_owner_or_admin" on public.payments;
drop policy if exists "payments_insert_self" on public.payments;
drop policy if exists "payments_insert_authenticated_users_only" on public.payments;
drop policy if exists "payments_update_admin_only" on public.payments;
drop policy if exists "payments_delete_admin_only" on public.payments;
drop policy if exists "payments_block_anon" on public.payments;

create policy "payments_select_owner_or_admin"
on public.payments
for select to authenticated
using (
  exists (
    select 1 from public.filings f
    where f.id = payments.filing_id
    and (
      f.user_id = (select auth.uid())
      or public.has_role((select auth.uid()), 'admin')
    )
  )
);

create policy "payments_insert_self"
on public.payments
for insert to authenticated
with check (
  exists (
    select 1 from public.filings f
    where f.id = payments.filing_id
    and f.user_id = (select auth.uid())
  )
);

create policy "payments_update_admin_only"
on public.payments
for update to authenticated
using (public.has_role((select auth.uid()), 'admin'))
with check (public.has_role((select auth.uid()), 'admin'));

create policy "payments_delete_admin_only"
on public.payments
for delete to authenticated
using (public.has_role((select auth.uid()), 'admin'));

create policy "payments_block_anon"
on public.payments
for all to anon
using (false) with check (false);

-- ---------- NOTIFICATIONS ----------
drop policy if exists "notifications_select_self_or_admin" on public.notifications;
drop policy if exists "notifications_select_owner_or_admin" on public.notifications;
drop policy if exists "notifications_insert_self" on public.notifications;
drop policy if exists "notifications_insert_service_only" on public.notifications;
drop policy if exists "Service role can insert notifications" on public.notifications;
drop policy if exists "notifications_update_self_or_admin" on public.notifications;
drop policy if exists "notifications_update_owner_or_admin" on public.notifications;
drop policy if exists "notifications_block_anon" on public.notifications;

create policy "notifications_select_self_or_admin"
on public.notifications
for select to authenticated
using (user_id = (select auth.uid()) or public.has_role((select auth.uid()), 'admin'));

create policy "notifications_update_self_or_admin"
on public.notifications
for update to authenticated
using (user_id = (select auth.uid()) or public.has_role((select auth.uid()), 'admin'))
with check (user_id = (select auth.uid()) or public.has_role((select auth.uid()), 'admin'));

create policy "notifications_block_anon"
on public.notifications
for all to anon
using (false) with check (false);

-- ---------- PROFILES ----------
drop policy if exists "profiles_select_self_or_admin" on public.profiles;
drop policy if exists "profiles_insert_self" on public.profiles;
drop policy if exists "profiles_update_self_or_admin" on public.profiles;
drop policy if exists "profiles_delete_admin_only" on public.profiles;
drop policy if exists "deny_anonymous_select" on public.profiles;
drop policy if exists "deny_anonymous_insert" on public.profiles;
drop policy if exists "deny_anonymous_update" on public.profiles;
drop policy if exists "deny_anonymous_delete" on public.profiles;

create policy "profiles_select_self_or_admin"
on public.profiles
for select to authenticated
using (user_id = (select auth.uid()) or public.has_role((select auth.uid()), 'admin'));

create policy "profiles_insert_self"
on public.profiles
for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "profiles_update_self_or_admin"
on public.profiles
for update to authenticated
using (user_id = (select auth.uid()) or public.has_role((select auth.uid()), 'admin'))
with check (user_id = (select auth.uid()) or public.has_role((select auth.uid()), 'admin'));

create policy "profiles_delete_admin_only"
on public.profiles
for delete to authenticated
using (public.has_role((select auth.uid()), 'admin'));

create policy "profiles_block_anon"
on public.profiles
for all to anon
using (false) with check (false);

-- ---------- DEADLINES ----------
drop policy if exists "deadlines_select_owner_or_admin" on public.deadlines;
drop policy if exists "deadlines_insert_owner" on public.deadlines;
drop policy if exists "deadlines_update_owner_or_admin" on public.deadlines;
drop policy if exists "deadlines_delete_owner_or_admin" on public.deadlines;

create policy "deadlines_select_owner_or_admin"
on public.deadlines
for select to authenticated
using (
  exists (
    select 1 from public.filings f
    where f.id = deadlines.filing_id
    and (
      f.user_id = (select auth.uid())
      or public.has_role((select auth.uid()), 'admin')
    )
  )
);

create policy "deadlines_insert_owner"
on public.deadlines
for insert to authenticated
with check (
  exists (
    select 1 from public.filings f
    where f.id = deadlines.filing_id
    and f.user_id = (select auth.uid())
  )
);

create policy "deadlines_update_owner_or_admin"
on public.deadlines
for update to authenticated
using (
  exists (
    select 1 from public.filings f
    where f.id = deadlines.filing_id
    and (
      f.user_id = (select auth.uid())
      or public.has_role((select auth.uid()), 'admin')
    )
  )
)
with check (
  exists (
    select 1 from public.filings f
    where f.id = deadlines.filing_id
    and (
      f.user_id = (select auth.uid())
      or public.has_role((select auth.uid()), 'admin')
    )
  )
);

create policy "deadlines_delete_owner_or_admin"
on public.deadlines
for delete to authenticated
using (
  exists (
    select 1 from public.filings f
    where f.id = deadlines.filing_id
    and (
      f.user_id = (select auth.uid())
      or public.has_role((select auth.uid()), 'admin')
    )
  )
);

-- ---------- UPCOMING_DEADLINES ----------
drop policy if exists "upcoming_deadlines_select_owner_or_admin" on public.upcoming_deadlines;
drop policy if exists "upcoming_deadlines_update_admin_only" on public.upcoming_deadlines;
drop policy if exists "upcoming_deadlines_delete_admin_only" on public.upcoming_deadlines;
drop policy if exists "upcoming_insert_admin_only" on public.upcoming_deadlines;

create policy "upcoming_deadlines_select_owner_or_admin"
on public.upcoming_deadlines
for select to authenticated
using (user_id = (select auth.uid()) or public.has_role((select auth.uid()), 'admin'));

create policy "upcoming_deadlines_update_admin_only"
on public.upcoming_deadlines
for update to authenticated
using (public.has_role((select auth.uid()), 'admin'))
with check (public.has_role((select auth.uid()), 'admin'));

create policy "upcoming_deadlines_delete_admin_only"
on public.upcoming_deadlines
for delete to authenticated
using (public.has_role((select auth.uid()), 'admin'));

-- ---------- FILING_QUEUE ----------
drop policy if exists "filing_queue_select_owner_or_admin" on public.filing_queue;
drop policy if exists "queue_insert_owner" on public.filing_queue;
drop policy if exists "Block anonymous access to filing queue" on public.filing_queue;
drop policy if exists "Service role can manage filing queue" on public.filing_queue;

create policy "filing_queue_select_owner_or_admin"
on public.filing_queue
for select to authenticated
using (
  exists (
    select 1 from public.filings f
    where f.id = filing_queue.filing_id
    and (
      f.user_id = (select auth.uid())
      or public.has_role((select auth.uid()), 'admin')
    )
  )
);

create policy "queue_insert_owner"
on public.filing_queue
for insert to authenticated
with check (
  exists (
    select 1 from public.filings f
    where f.id = filing_queue.filing_id
    and f.user_id = (select auth.uid())
  )
);

create policy "filing_queue_block_anon"
on public.filing_queue
for all to anon
using (false) with check (false);

-- ---------- SECTION TABLES ----------
drop policy if exists "patent_sections_select_owner_or_admin" on public.patent_sections;
drop policy if exists "Service role can manage patent sections" on public.patent_sections;

create policy "patent_sections_select_owner_or_admin"
on public.patent_sections
for select to authenticated
using (
  exists (
    select 1 from public.filings f
    where f.id = patent_sections.filing_id
    and (
      f.user_id = (select auth.uid())
      or public.has_role((select auth.uid()), 'admin')
    )
  )
);

drop policy if exists "trademark_sections_select_owner_or_admin" on public.trademark_sections;
drop policy if exists "Service role can manage trademark sections" on public.trademark_sections;

create policy "trademark_sections_select_owner_or_admin"
on public.trademark_sections
for select to authenticated
using (
  exists (
    select 1 from public.filings f
    where f.id = trademark_sections.filing_id
    and (
      f.user_id = (select auth.uid())
      or public.has_role((select auth.uid()), 'admin')
    )
  )
);

drop policy if exists "filing_sections_select_owner_or_admin" on public.filing_sections;
drop policy if exists "Service role can manage filing sections" on public.filing_sections;

create policy "filing_sections_select_owner_or_admin"
on public.filing_sections
for select to authenticated
using (
  exists (
    select 1 from public.filings f
    where f.id = filing_sections.filing_id
    and (
      f.user_id = (select auth.uid())
      or public.has_role((select auth.uid()), 'admin')
    )
  )
);

-- ---------- AI / COPYRIGHT / LOGS ----------
drop policy if exists "ai_filing_sessions_select_owner_or_admin" on public.ai_filing_sessions;
drop policy if exists "Service role can manage AI sessions" on public.ai_filing_sessions;

create policy "ai_filing_sessions_select_owner_or_admin"
on public.ai_filing_sessions
for select to authenticated
using (
  exists (
    select 1 from public.filings f
    where f.id = ai_filing_sessions.filing_id
    and (
      f.user_id = (select auth.uid())
      or public.has_role((select auth.uid()), 'admin')
    )
  )
);

drop policy if exists "copyrights_select_owner_or_admin" on public.copyrights;
drop policy if exists "Service role can manage copyrights" on public.copyrights;

create policy "copyrights_select_owner_or_admin"
on public.copyrights
for select to authenticated
using (
  exists (
    select 1 from public.filings f
    where f.id = copyrights.filing_id
    and (
      f.user_id = (select auth.uid())
      or public.has_role((select auth.uid()), 'admin')
    )
  )
);

drop policy if exists "copyright_uploads_select_owner_or_admin" on public.copyright_uploads;
drop policy if exists "Service role can manage copyright uploads" on public.copyright_uploads;

create policy "copyright_uploads_select_owner_or_admin"
on public.copyright_uploads
for select to authenticated
using (
  exists (
    select 1 from public.copyrights c
    join public.filings f on f.id = c.filing_id
    where c.id = copyright_uploads.copyright_id
    and (
      f.user_id = (select auth.uid())
      or public.has_role((select auth.uid()), 'admin')
    )
  )
);

drop policy if exists "trademark_clearance_logs_select_owner_or_admin" on public.trademark_clearance_logs;
drop policy if exists "Service role can manage clearance logs" on public.trademark_clearance_logs;

create policy "trademark_clearance_logs_select_owner_or_admin"
on public.trademark_clearance_logs
for select to authenticated
using (
  exists (
    select 1 from public.filings f
    where f.id = trademark_clearance_logs.filing_id
    and (
      f.user_id = (select auth.uid())
      or public.has_role((select auth.uid()), 'admin')
    )
  )
);

-- ---------- SETTINGS ----------
drop policy if exists "settings_admin_only" on public.settings;
create policy "settings_admin_only"
on public.settings
for all to authenticated
using (public.has_role((select auth.uid()), 'admin'))
with check (public.has_role((select auth.uid()), 'admin'));

-- ---------- AUDIT LOG ----------
drop policy if exists "audit_log_select_admin_only" on public.audit_log;
drop policy if exists "audit_log_deny_insert" on public.audit_log;
drop policy if exists "audit_log_deny_update" on public.audit_log;
drop policy if exists "audit_log_deny_delete" on public.audit_log;

create policy "audit_log_select_admin_only"
on public.audit_log
for select to authenticated
using (public.has_role((select auth.uid()), 'admin'));

create policy "audit_log_deny_insert"
on public.audit_log
for insert to authenticated
with check (false);

create policy "audit_log_deny_update"
on public.audit_log
for update to authenticated
using (false) with check (false);

create policy "audit_log_deny_delete"
on public.audit_log
for delete to authenticated
using (false);

-- ---------- USER_AGREEMENTS ----------
drop policy if exists "user_agreements_select_owner_or_admin" on public.user_agreements;
drop policy if exists "ua_upsert_self" on public.user_agreements;
drop policy if exists "ua_update_self" on public.user_agreements;

create policy "user_agreements_select_owner_or_admin"
on public.user_agreements
for select to authenticated
using (user_id = (select auth.uid()) or public.has_role((select auth.uid()), 'admin'));

create policy "ua_upsert_self"
on public.user_agreements
for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "ua_update_self"
on public.user_agreements
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- ---------- CLEAN DUPLICATE INDEXES ----------
do $$
begin
  if exists (select 1 from pg_indexes where schemaname='public' and tablename='documents' and indexname='idx_documents_filing_id') then
    drop index if exists public.idx_documents_filing_id;
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_indexes where schemaname='public' and tablename='filings' and indexname='idx_filings_user') then
    drop index if exists public.idx_filings_user;
  end if;
  if exists (select 1 from pg_indexes where schemaname='public' and tablename='filings' and indexname='idx_filings_user_id') then
    drop index if exists public.idx_filings_user_id;
  end if;
end $$;