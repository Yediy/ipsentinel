-- Secure filing_documents view with explicit access controls and security settings
BEGIN;

-- Drop existing view to recreate with security settings
DROP VIEW IF EXISTS public.filing_documents;

-- Recreate the view with security invoker and barrier settings
-- This ensures it uses caller's privileges and prevents predicate pushdown
CREATE VIEW public.filing_documents 
WITH (security_invoker = on, security_barrier = on) AS
SELECT 
  d.id,
  d.filing_id,
  d.kind,
  d.url,
  d.sha256,
  d.created_at
FROM public.documents d
JOIN public.filings f ON f.id = d.filing_id
WHERE (
  -- Owner has access via user_id
  ((auth.uid() IS NOT NULL) AND f.user_id = auth.uid())
  -- Anonymous access via contact email
  OR ((f.user_id IS NULL) AND (f.contact_email IS NOT NULL) AND (auth.email() = f.contact_email))
  -- Admin access
  OR is_admin()
);

-- Revoke default public access
REVOKE ALL ON public.filing_documents FROM anon;
REVOKE ALL ON public.filing_documents FROM PUBLIC;

-- Grant select to authenticated users (view logic handles access control)
GRANT SELECT ON public.filing_documents TO authenticated;

-- Service role retains full access for server operations
GRANT ALL ON public.filing_documents TO service_role;

COMMIT;