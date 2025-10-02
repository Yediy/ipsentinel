-- Add missing column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tos_accepted_at timestamptz;

-- Ensure profiles trigger exists (idempotent)
CREATE OR REPLACE FUNCTION public.ensure_profile() 
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles(user_id, email)
  VALUES (new.id, new.email) 
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END$$;

-- Recreate trigger (drop first to ensure clean state)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created 
  AFTER INSERT ON auth.users 
  FOR EACH ROW 
  EXECUTE FUNCTION public.ensure_profile();

-- Helper function to extract filing_id from storage path
CREATE OR REPLACE FUNCTION public.extract_filing_id_from_path(path text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
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

-- Storage RLS policies for docs bucket
DROP POLICY IF EXISTS "read_own_docs" ON storage.objects;
CREATE POLICY "read_own_docs" ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id = 'docs' AND EXISTS (
    SELECT 1 FROM public.filings f
    WHERE f.id = public.extract_filing_id_from_path(name)
      AND f.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "write_own_docs" ON storage.objects;
CREATE POLICY "write_own_docs" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'docs' AND EXISTS (
    SELECT 1 FROM public.filings f
    WHERE f.id = public.extract_filing_id_from_path(name)
      AND f.user_id = auth.uid()
  )
);