-- FORCE DROP all problematic policies
-- Step 1: Drop profiles.role column
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role CASCADE;

-- Step 2: Drop ALL old policies with contact_email or is_admin
DROP POLICY IF EXISTS "filings_select_secure_access" ON public.filings CASCADE;
DROP POLICY IF EXISTS "filings_insert_secure_access" ON public.filings CASCADE;
DROP POLICY IF EXISTS "filings_update_secure_access" ON public.filings CASCADE;
DROP POLICY IF EXISTS "filings_delete_secure_access" ON public.filings CASCADE;

DROP POLICY IF EXISTS "filing_documents_select_secure_access" ON public.filing_documents CASCADE;
DROP POLICY IF EXISTS "filing_documents_insert_secure_access" ON public.filing_documents CASCADE;
DROP POLICY IF EXISTS "filing_documents_update_secure_access" ON public.filing_documents CASCADE;
DROP POLICY IF EXISTS "filing_documents_delete_secure_access" ON public.filing_documents CASCADE;

DROP POLICY IF EXISTS "documents_select_secure_access" ON public.documents CASCADE;
DROP POLICY IF EXISTS "documents_insert_secure_access" ON public.documents CASCADE;
DROP POLICY IF EXISTS "documents_delete_secure_access" ON public.documents CASCADE;
DROP POLICY IF EXISTS "documents_update_admin_only" ON public.documents CASCADE;

DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications CASCADE;
DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications CASCADE;
DROP POLICY IF EXISTS "notif_select_self" ON public.notifications CASCADE;
DROP POLICY IF EXISTS "notif_update_self_or_admin" ON public.notifications CASCADE;
DROP POLICY IF EXISTS "notif_insert_self_or_admin" ON public.notifications CASCADE;

DROP POLICY IF EXISTS "Users can view queue status for their filings" ON public.filing_queue CASCADE;
DROP POLICY IF EXISTS "queue_select_owner_or_admin" ON public.filing_queue CASCADE;

DROP POLICY IF EXISTS "Users can view patent sections for their filings" ON public.patent_sections CASCADE;
DROP POLICY IF EXISTS "Users can view trademark sections for their filings" ON public.trademark_sections CASCADE;
DROP POLICY IF EXISTS "Users can view their filing sections" ON public.filing_sections CASCADE;
DROP POLICY IF EXISTS "Users can view their AI sessions" ON public.ai_filing_sessions CASCADE;
DROP POLICY IF EXISTS "Users can view their copyright filings" ON public.copyrights CASCADE;
DROP POLICY IF EXISTS "Users can view their copyright uploads" ON public.copyright_uploads CASCADE;
DROP POLICY IF EXISTS "Users can view clearance logs for their filings" ON public.trademark_clearance_logs CASCADE;

DROP POLICY IF EXISTS "settings admin only" ON public.settings CASCADE;
DROP POLICY IF EXISTS "audit admin only" ON public.audit_log CASCADE;

DROP POLICY IF EXISTS "payments_select_authenticated_owner_or_admin" ON public.payments CASCADE;
DROP POLICY IF EXISTS "payments_update_admin_only" ON public.payments CASCADE;
DROP POLICY IF EXISTS "payments_delete_admin_only" ON public.payments CASCADE;

DROP POLICY IF EXISTS "upcoming_select_owner_or_admin" ON public.upcoming_deadlines CASCADE;
DROP POLICY IF EXISTS "upcoming_update_admin_only" ON public.upcoming_deadlines CASCADE;
DROP POLICY IF EXISTS "upcoming_delete_admin_only" ON public.upcoming_deadlines CASCADE;

DROP POLICY IF EXISTS "deadlines_select_owner_or_admin" ON public.deadlines CASCADE;
DROP POLICY IF EXISTS "deadlines_update_owner_or_admin" ON public.deadlines CASCADE;
DROP POLICY IF EXISTS "deadlines_delete_owner_or_admin" ON public.deadlines CASCADE;

DROP POLICY IF EXISTS "ua_select_self_or_admin" ON public.user_agreements CASCADE;