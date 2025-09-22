-- Secure filing_documents with RLS and owner/admin policies
BEGIN;

-- Enable and enforce Row Level Security
ALTER TABLE public.filing_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filing_documents FORCE ROW LEVEL SECURITY;

-- Remove any existing policies to avoid duplicates
DROP POLICY IF EXISTS "filing_docs_select_owner_or_admin" ON public.filing_documents;
DROP POLICY IF EXISTS "filing_docs_insert_owner_or_admin" ON public.filing_documents;
DROP POLICY IF EXISTS "filing_docs_update_admin_only" ON public.filing_documents;
DROP POLICY IF EXISTS "filing_docs_delete_owner_or_admin" ON public.filing_documents;

-- Allow owners (by user_id), contact email owners, or admins to SELECT
CREATE POLICY "filing_docs_select_owner_or_admin"
ON public.filing_documents
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.filings f
    WHERE f.id = public.filing_documents.filing_id
      AND (
        ((auth.uid() IS NOT NULL) AND f.user_id = auth.uid())
        OR ((f.user_id IS NULL) AND (f.contact_email IS NOT NULL) AND (auth.email() = f.contact_email))
        OR is_admin()
      )
  )
);

-- Allow owners (by user_id), contact email owners, or admins to INSERT
CREATE POLICY "filing_docs_insert_owner_or_admin"
ON public.filing_documents
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.filings f
    WHERE f.id = public.filing_documents.filing_id
      AND (
        ((auth.uid() IS NOT NULL) AND f.user_id = auth.uid())
        OR ((f.user_id IS NULL) AND (f.contact_email IS NOT NULL) AND (auth.email() = f.contact_email))
        OR is_admin()
      )
  )
);

-- Only admins can UPDATE
CREATE POLICY "filing_docs_update_admin_only"
ON public.filing_documents
FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());

-- Allow owners (by user_id), contact email owners, or admins to DELETE
CREATE POLICY "filing_docs_delete_owner_or_admin"
ON public.filing_documents
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.filings f
    WHERE f.id = public.filing_documents.filing_id
      AND (
        ((auth.uid() IS NOT NULL) AND f.user_id = auth.uid())
        OR ((f.user_id IS NULL) AND (f.contact_email IS NOT NULL) AND (auth.email() = f.contact_email))
        OR is_admin()
      )
  )
);

COMMIT;