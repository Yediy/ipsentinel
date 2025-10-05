-- Fix profiles table to prevent cross-user data access
-- Remove the RESTRICTIVE policy that only checks authentication without ownership

-- Drop the restrictive policy that's causing the security issue
DROP POLICY IF EXISTS "profiles_require_authentication" ON public.profiles;

-- Verify the main SELECT policy has proper ownership checks
-- (This should already exist from previous migration, but recreating for clarity)
DROP POLICY IF EXISTS "profiles_select_self_or_admin" ON public.profiles;

CREATE POLICY "profiles_select_self_or_admin"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- User can only read their own profile OR must be admin
  (user_id = auth.uid()) 
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Update table comment to reflect the security model
COMMENT ON TABLE public.profiles IS 
'Contains sensitive user PII (emails, names). Users can only view their own profile. Admins can view all profiles.';

COMMENT ON POLICY "profiles_select_self_or_admin" ON public.profiles IS 
'Authenticated users can ONLY view their own profile (user_id = auth.uid()). Admins can view all profiles via has_role check.';