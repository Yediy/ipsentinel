-- CRITICAL SECURITY FIX: Fix filings table RLS policies to prevent anonymous access
-- Issue: Current policies apply to 'public' role which includes anonymous users
-- This could expose sensitive IP data to competitors and unauthorized access

-- Drop all existing policies on filings table
DROP POLICY IF EXISTS "filings_select_owner_or_admin" ON public.filings;
DROP POLICY IF EXISTS "filings_insert_owner" ON public.filings;
DROP POLICY IF EXISTS "filings_update_owner_or_admin" ON public.filings;
DROP POLICY IF EXISTS "filings_delete_owner_or_admin" ON public.filings;

-- Create new secure policies that ONLY apply to authenticated users
-- SELECT Policy: Only authenticated users who own the filing or admins can view
CREATE POLICY "filings_select_authenticated_owner_or_admin" 
ON public.filings 
FOR SELECT 
TO authenticated
USING (
  -- User must be authenticated (auth.uid() is not null)
  auth.uid() IS NOT NULL
  AND (
    -- Either user owns this filing
    user_id = auth.uid()
    OR 
    -- Or user is an admin
    is_admin()
  )
);

-- INSERT Policy: Only authenticated users can create filings for themselves
CREATE POLICY "filings_insert_authenticated_owner" 
ON public.filings 
FOR INSERT 
TO authenticated
WITH CHECK (
  -- User must be authenticated
  auth.uid() IS NOT NULL
  AND 
  -- User can only create filings for themselves
  user_id = auth.uid()
);

-- UPDATE Policy: Only authenticated owners or admins can update
CREATE POLICY "filings_update_authenticated_owner_or_admin" 
ON public.filings 
FOR UPDATE 
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    user_id = auth.uid() 
    OR is_admin()
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    user_id = auth.uid() 
    OR is_admin()
  )
);

-- DELETE Policy: Only authenticated owners or admins can delete
CREATE POLICY "filings_delete_authenticated_owner_or_admin" 
ON public.filings 
FOR DELETE 
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    user_id = auth.uid() 
    OR is_admin()
  )
);

-- Add security documentation
COMMENT ON TABLE public.filings IS 
'SECURITY CRITICAL: Contains sensitive intellectual property including patent claims, detailed descriptions, trademark data, and contact information. Access is strictly restricted to authenticated users who own the filing or system administrators. Anonymous access is completely blocked to prevent competitors from accessing proprietary business information.';

-- Verify RLS is enabled (should already be enabled)
ALTER TABLE public.filings ENABLE ROW LEVEL SECURITY;

-- Log the security fix
DO $$
BEGIN
  RAISE NOTICE 'CRITICAL SECURITY FIX APPLIED: Filings table policies now restrict access to authenticated users only. Anonymous access to sensitive IP data is completely blocked. Only authenticated filing owners and admins can access filing data.';
END $$;