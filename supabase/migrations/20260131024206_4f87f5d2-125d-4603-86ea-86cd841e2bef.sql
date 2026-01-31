-- Add RLS policies for 'filings' storage bucket
-- Users can only access files in their own filing folders

-- Policy: Users can upload files to their own filings
CREATE POLICY "Users can upload to own filings"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'filings' 
  AND (
    -- Extract filing_id from path (format: filings/{filing_id}/...)
    EXISTS (
      SELECT 1 FROM public.filings f
      WHERE f.id = public.extract_filing_id_from_path(name)
      AND f.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Policy: Users can view files from their own filings
CREATE POLICY "Users can view own filing files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'filings' 
  AND (
    EXISTS (
      SELECT 1 FROM public.filings f
      WHERE f.id = public.extract_filing_id_from_path(name)
      AND f.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Policy: Users can update files in their own filings
CREATE POLICY "Users can update own filing files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'filings' 
  AND (
    EXISTS (
      SELECT 1 FROM public.filings f
      WHERE f.id = public.extract_filing_id_from_path(name)
      AND f.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
)
WITH CHECK (
  bucket_id = 'filings' 
  AND (
    EXISTS (
      SELECT 1 FROM public.filings f
      WHERE f.id = public.extract_filing_id_from_path(name)
      AND f.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Policy: Users can delete files from their own filings
CREATE POLICY "Users can delete own filing files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'filings' 
  AND (
    EXISTS (
      SELECT 1 FROM public.filings f
      WHERE f.id = public.extract_filing_id_from_path(name)
      AND f.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Add RLS policies for 'copyright-works' storage bucket
-- Policy: Users can upload copyright works to their own filings
CREATE POLICY "Users can upload copyright works"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'copyright-works' 
  AND (
    EXISTS (
      SELECT 1 FROM public.filings f
      WHERE f.id = public.extract_filing_id_from_path(name)
      AND f.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Policy: Users can view their own copyright works
CREATE POLICY "Users can view own copyright works"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'copyright-works' 
  AND (
    EXISTS (
      SELECT 1 FROM public.filings f
      WHERE f.id = public.extract_filing_id_from_path(name)
      AND f.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Policy: Users can update their own copyright works
CREATE POLICY "Users can update own copyright works"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'copyright-works' 
  AND (
    EXISTS (
      SELECT 1 FROM public.filings f
      WHERE f.id = public.extract_filing_id_from_path(name)
      AND f.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
)
WITH CHECK (
  bucket_id = 'copyright-works' 
  AND (
    EXISTS (
      SELECT 1 FROM public.filings f
      WHERE f.id = public.extract_filing_id_from_path(name)
      AND f.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Policy: Users can delete their own copyright works
CREATE POLICY "Users can delete own copyright works"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'copyright-works' 
  AND (
    EXISTS (
      SELECT 1 FROM public.filings f
      WHERE f.id = public.extract_filing_id_from_path(name)
      AND f.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Block anonymous access to both buckets
CREATE POLICY "Block anonymous access to filings bucket"
ON storage.objects
AS RESTRICTIVE
FOR ALL
TO anon
USING (bucket_id NOT IN ('filings', 'copyright-works'))
WITH CHECK (bucket_id NOT IN ('filings', 'copyright-works'));