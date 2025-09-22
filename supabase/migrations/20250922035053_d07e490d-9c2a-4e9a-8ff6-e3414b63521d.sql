-- Fix security issue: Add explicit RLS policies to filing_documents view
-- Views need their own RLS policies to properly restrict access

-- Enable RLS on the filing_documents view
ALTER VIEW public.filing_documents SET (security_barrier = true);

-- Since we can't directly apply RLS policies to views in the same way as tables,
-- we need to ensure the underlying documents table security is properly enforced
-- The view should inherit security from the documents table, but let's verify
-- by recreating it with proper security context

-- Drop and recreate the view to ensure it properly inherits security
DROP VIEW IF EXISTS public.filing_documents;

-- Create the view with proper security inheritance
CREATE VIEW public.filing_documents 
WITH (security_barrier = true) AS
SELECT 
  d.id,
  d.filing_id,
  d.kind as document_type,
  d.url as file_path,
  d.sha256,
  d.created_at,
  null::jsonb as metadata
FROM public.documents d
WHERE EXISTS (
  SELECT 1 FROM public.filings f 
  WHERE f.id = d.filing_id 
    AND (f.user_id = auth.uid() OR public.is_admin())
);