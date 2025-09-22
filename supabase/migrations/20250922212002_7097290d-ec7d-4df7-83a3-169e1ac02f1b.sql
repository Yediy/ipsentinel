-- Recreate secure filing_documents view with embedded access control
BEGIN;

DROP VIEW IF EXISTS public.filing_documents;

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
  ((auth.uid() IS NOT NULL) AND f.user_id = auth.uid())
  OR ((f.user_id IS NULL) AND (f.contact_email IS NOT NULL) AND (auth.email() = f.contact_email))
  OR is_admin()
);

REVOKE ALL ON public.filing_documents FROM anon;
REVOKE ALL ON public.filing_documents FROM PUBLIC;
GRANT SELECT ON public.filing_documents TO authenticated;
GRANT ALL ON public.filing_documents TO service_role;

COMMIT;