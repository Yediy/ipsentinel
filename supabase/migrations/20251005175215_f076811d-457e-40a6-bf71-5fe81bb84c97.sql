-- Fix Patent and Trademark Filing Details Public Exposure
-- Ensure filings table properly restricts anonymous access

-- Drop and recreate the SELECT policy with explicit authentication check
DROP POLICY IF EXISTS "filings_select_owner_or_admin" ON public.filings;

CREATE POLICY "filings_select_owner_or_admin"
ON public.filings
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND (
    user_id = auth.uid() 
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Ensure the block_anon policy is properly configured
DROP POLICY IF EXISTS "filings_block_anon" ON public.filings;

CREATE POLICY "filings_deny_anon_access"
ON public.filings
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Add explicit comments for documentation
COMMENT ON TABLE public.filings IS 
'Contains sensitive IP filing data. Access restricted to authenticated users who own the filing or admins only.';

COMMENT ON POLICY "filings_select_owner_or_admin" ON public.filings IS 
'Authenticated users can only view their own filings or all filings if they are admins.';

COMMENT ON POLICY "filings_deny_anon_access" ON public.filings IS 
'Explicitly deny all anonymous access to prevent IP theft.';