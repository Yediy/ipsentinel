-- Alternative approach: Create a security definer function for safe document access
-- instead of relying on the view

CREATE OR REPLACE FUNCTION public.get_user_documents(p_filing_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  filing_id uuid, 
  document_type text,
  file_path text,
  sha256 text,
  created_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $$
  SELECT 
    d.id,
    d.filing_id,
    d.kind::text as document_type,
    d.url as file_path,
    d.sha256,
    d.created_at
  FROM public.documents d
  JOIN public.filings f ON f.id = d.filing_id
  WHERE (p_filing_id IS NULL OR d.filing_id = p_filing_id)
    AND (f.user_id = auth.uid() OR public.is_admin());
$$;