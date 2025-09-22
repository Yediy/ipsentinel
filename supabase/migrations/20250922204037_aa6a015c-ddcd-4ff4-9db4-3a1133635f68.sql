-- Secure filing_documents with RLS mirroring documents table policies
BEGIN;

-- Enable RLS on filing_documents
ALTER TABLE public.filing_documents ENABLE ROW LEVEL SECURITY;

-- Clean up any existing policies to avoid duplicates
DROP POLICY IF EXISTS "filing_documents_select_secure_access" ON public.filing_documents;
DROP POLICY IF EXISTS "filing_documents_insert_secure_access" ON public.filing_documents;
DROP POLICY IF EXISTS "filing_documents_delete_secure_access" ON public.filing_documents;
DROP POLICY IF EXISTS "filing_documents_update_admin_only" ON public.filing_documents;

-- Allow owners (by user_id) or contact_email based access, and admins, to SELECT
CREATE POLICY "filing_documents_select_secure_access"
ON public.filing_documents
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM filings f
    WHERE f.id = filing_documents.filing_id
      AND (
        ((auth.uid() IS NOT NULL) AND f.user_id = auth.uid())
        OR ((f.user_id IS NULL) AND (f.contact_email IS NOT NULL) AND (auth.email() = f.contact_email))
        OR is_admin()
      )
  )
);

-- Allow owners, contact_email users, or admins to INSERT rows for their own filings
CREATE POLICY "filing_documents_insert_secure_access"
ON public.filing_documents
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM filings f
    WHERE f.id = filing_documents.filing_id
      AND (
        ((auth.uid() IS NOT NULL) AND f.user_id = auth.uid())
        OR ((f.user_id IS NULL) AND (f.contact_email IS NOT NULL) AND (auth.email() = f.contact_email))
        OR is_admin()
      )
  )
);

-- Allow owners or admins to DELETE their filing documents
CREATE POLICY "filing_documents_delete_secure_access"
ON public.filing_documents
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM filings f
    WHERE f.id = filing_documents.filing_id
      AND (
        ((auth.uid() IS NOT NULL) AND f.user_id = auth.uid())
        OR is_admin()
      )
  )
);

-- Only admins can UPDATE filing documents metadata (e.g., correcting URLs)
CREATE POLICY "filing_documents_update_admin_only"
ON public.filing_documents
FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());

COMMIT;