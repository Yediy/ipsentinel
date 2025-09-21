-- Fix filing_documents table/view issue
-- Drop the existing table if it exists and create view
drop table if exists public.filing_documents cascade;

-- Create the view mapping to documents table
create view public.filing_documents as
  select id, filing_id, kind as document_type, url as file_path, sha256, created_at, 
         null::jsonb as metadata
  from public.documents;