-- Fix Customer Email Addresses and Personal Data Public Exposure
-- Ensure profiles table properly restricts anonymous access to sensitive PII

-- Drop and recreate the SELECT policy with explicit authentication requirements
DROP POLICY IF EXISTS "profiles_select_self_or_admin" ON public.profiles;

CREATE POLICY "profiles_select_self_or_admin"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND (
    user_id = auth.uid() 
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Ensure the block_anon policy is properly configured with explicit denial
DROP POLICY IF EXISTS "profiles_block_anon" ON public.profiles;

CREATE POLICY "profiles_deny_anon_access"
ON public.profiles
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Add an additional RESTRICTIVE policy as defense-in-depth
CREATE POLICY "profiles_require_authentication"
ON public.profiles
AS RESTRICTIVE
FOR SELECT
TO public
USING (auth.uid() IS NOT NULL);

-- Ensure UPDATE and INSERT policies also explicitly require authentication
DROP POLICY IF EXISTS "profiles_update_self_or_admin" ON public.profiles;

CREATE POLICY "profiles_update_self_or_admin"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND (
    user_id = auth.uid() 
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND (
    user_id = auth.uid() 
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;

CREATE POLICY "profiles_insert_self"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND user_id = auth.uid()
);

-- Add explicit comments for documentation
COMMENT ON TABLE public.profiles IS 
'Contains sensitive user PII (emails, names, user IDs). Access restricted to authenticated users viewing their own profile or admins only.';

COMMENT ON POLICY "profiles_select_self_or_admin" ON public.profiles IS 
'Authenticated users can only view their own profile or all profiles if they are admins.';

COMMENT ON POLICY "profiles_deny_anon_access" ON public.profiles IS 
'Explicitly deny all anonymous access to prevent email harvesting and PII theft.';

COMMENT ON POLICY "profiles_require_authentication" ON public.profiles IS 
'RESTRICTIVE policy ensuring authentication is required as defense-in-depth.';