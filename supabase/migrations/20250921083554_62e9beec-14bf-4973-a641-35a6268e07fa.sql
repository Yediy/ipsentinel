-- Check for and fix any security definer views
-- Drop and recreate the filing_documents view to ensure it's not security definer
DROP VIEW IF EXISTS public.filing_documents;

CREATE VIEW public.filing_documents AS
SELECT 
  id, 
  filing_id, 
  kind as document_type, 
  url as file_path, 
  sha256, 
  created_at,
  null::jsonb as metadata
FROM public.documents;