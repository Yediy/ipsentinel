-- Set security_invoker on views to avoid SECURITY DEFINER behavior
-- Ref: https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view

-- Ensure Postgres 15+ feature: security_invoker on views
-- Apply to public.filing_documents if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_views 
    WHERE schemaname = 'public' AND viewname = 'filing_documents'
  ) THEN
    EXECUTE 'ALTER VIEW public.filing_documents SET (security_invoker = on)';
  END IF;
END $$;

-- Optional hardening: keep RLS enforced via base table policies (no change in logic)
-- No data changes; safe, backwards-compatible.