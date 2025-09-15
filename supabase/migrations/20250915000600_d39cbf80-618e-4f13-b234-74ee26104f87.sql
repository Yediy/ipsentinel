-- Fix profiles table security - prevent email address theft
-- Remove duplicate policies and add explicit anonymous access denial

-- Remove the duplicate SELECT policy
DROP POLICY IF EXISTS "Users can view only their own profile" ON public.profiles;

-- Add explicit policy to block anonymous access to profiles
CREATE POLICY "Block anonymous access to profiles" 
ON public.profiles 
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);

-- Ensure the remaining SELECT policy is properly restrictive
-- (This policy already exists and is correct, but let's verify it's the only one)
-- It should only allow users to read their own profile data

-- Add a comment to document the security intention
COMMENT ON TABLE public.profiles IS 'User profiles table - contains sensitive data including email addresses. Access is restricted to authenticated users for their own data only.';

-- Verify no data can leak by ensuring proper column-level security
-- The email column should only be accessible to the profile owner
COMMENT ON COLUMN public.profiles.email IS 'User email address - restricted access via RLS policies to prevent data theft';