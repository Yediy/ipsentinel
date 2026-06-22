
-- ============================================================
-- 1) STORAGE POLICY FIXES
-- ============================================================

-- Filings: SELECT policy with broken EXISTS check
DROP POLICY IF EXISTS "Users can view their filing documents" ON storage.objects;

-- Filings: INSERT policy targeting public role with no ownership check
DROP POLICY IF EXISTS "Service can upload filing documents" ON storage.objects;

-- Copyright works: ALL policy targeting public role
DROP POLICY IF EXISTS "Service role can manage copyright works" ON storage.objects;

-- Copyright works: drop legacy public-role policies and recreate scoped to authenticated
DROP POLICY IF EXISTS "Users can view their copyright works" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their copyright works" ON storage.objects;

CREATE POLICY "Users can view their copyright works"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'copyright-works'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload their copyright works"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'copyright-works'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- 2) ai_prompt_templates: explicit deny for authenticated
-- ============================================================
CREATE POLICY "Deny all authenticated access to ai_prompt_templates"
  ON public.ai_prompt_templates
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- ============================================================
-- 3) upcoming_deadlines: explicit deny INSERT for authenticated
-- ============================================================
CREATE POLICY "Deny authenticated inserts on upcoming_deadlines"
  ON public.upcoming_deadlines
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- ============================================================
-- 4) SECURITY DEFINER function privileges
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.compute_deadlines_for_filing(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_upcoming_deadlines(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_user(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.pending_deadlines_window(integer) FROM PUBLIC, anon, authenticated;

-- Trigger-only functions: revoke from clients (triggers run regardless of EXECUTE grants)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_profile() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_filings_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_deadlines_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_new_document() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_filing_documents() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_profile_user_id() FROM PUBLIC, anon, authenticated;

-- Keep helpers referenced by RLS policies callable by signed-in users
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.extract_filing_id_from_path(text) TO authenticated;

-- ============================================================
-- 5) GraphQL / Data API exposure: revoke anon from all public tables
-- ============================================================
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

-- Admin/system-only tables: revoke from authenticated too
REVOKE ALL ON public.admin_users FROM authenticated;
REVOKE ALL ON public.ai_prompt_templates FROM authenticated;
REVOKE ALL ON public.audit_log FROM authenticated;
REVOKE ALL ON public.settings FROM authenticated;
REVOKE ALL ON public.webhook_events FROM authenticated;

-- Re-grant SELECT on audit_log to authenticated since admins read via RLS policy
GRANT SELECT ON public.audit_log TO authenticated;
