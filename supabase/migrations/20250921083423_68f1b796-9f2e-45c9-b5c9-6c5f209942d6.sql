-- Fix the security definer view issue
-- Drop and recreate the view without security definer (which is the default and what we want)
drop view if exists public.filing_documents;

-- Create the view mapping to documents table (without security definer)
create view public.filing_documents as
  select id, filing_id, kind as document_type, url as file_path, sha256, created_at, 
         null::jsonb as metadata
  from public.documents;