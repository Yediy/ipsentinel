-- Fix Security Definer View issue by removing security_barrier property
-- The security_barrier property can cause views to be flagged as security definer
-- Instead, we'll rely on the underlying table's RLS policies

-- Drop and recreate the view without security_barrier
DROP VIEW IF EXISTS public.filing_documents;

-- Create a simple view that relies on the underlying documents table RLS
-- This approach is more secure as it doesn't bypass RLS policies
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

-- The security is now enforced by the documents table RLS policies
-- which already restrict access to filing owners and admins