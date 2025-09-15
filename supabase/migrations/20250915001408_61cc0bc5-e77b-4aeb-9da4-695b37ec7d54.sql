-- Fix final security issue: secure filing_queue table access

-- Add user-specific access control to filing_queue table
-- Users should only see queue status for their own filings

-- Create policy to allow users to view queue status for their filings only
CREATE POLICY "Users can view queue status for their filings" 
ON public.filing_queue 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.filings f 
    WHERE f.id = filing_queue.filing_id 
    AND (
      -- User owns the filing
      (auth.uid() = f.user_id) 
      OR 
      -- Anonymous filing where user's email matches contact_email
      (f.user_id IS NULL AND f.contact_email IS NOT NULL AND auth.email() = f.contact_email)
    )
  )
);

-- Block anonymous access to filing queue
CREATE POLICY "Block anonymous access to filing queue" 
ON public.filing_queue 
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);

-- Add documentation
COMMENT ON POLICY "Users can view queue status for their filings" ON public.filing_queue 
IS 'Allows authenticated users to view processing queue status only for filings they own or have access to via email matching';