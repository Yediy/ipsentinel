-- Drop policies that depend on the function
DROP POLICY IF EXISTS "read_own_docs" ON storage.objects;
DROP POLICY IF EXISTS "write_own_docs" ON storage.objects;

-- Drop and recreate function with proper search_path
DROP FUNCTION IF EXISTS public.extract_filing_id_from_path(text) CASCADE;

CREATE OR REPLACE FUNCTION public.extract_filing_id_from_path(path text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matches text[];
BEGIN
  matches := regexp_matches(path, 'filings/([0-9a-f-]+)/');
  IF matches IS NULL OR array_length(matches, 1) = 0 THEN
    RETURN NULL;
  END IF;
  RETURN matches[1]::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- Recreate storage policies
CREATE POLICY "read_own_docs" ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id = 'docs' AND EXISTS (
    SELECT 1 FROM public.filings f
    WHERE f.id = public.extract_filing_id_from_path(name)
      AND f.user_id = auth.uid()
  )
);

CREATE POLICY "write_own_docs" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'docs' AND EXISTS (
    SELECT 1 FROM public.filings f
    WHERE f.id = public.extract_filing_id_from_path(name)
      AND f.user_id = auth.uid()
  )
);