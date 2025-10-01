-- Fix user_agreements_v1 security issue
-- The view currently grants SELECT to both anon and authenticated roles
-- We need to revoke access from anonymous users and rely on base table RLS

-- Revoke all access from anonymous users
REVOKE ALL ON public.user_agreements_v1 FROM anon;

-- Keep access for authenticated users only
-- The RLS policies on the base user_agreements table will enforce
-- that users can only see their own data
GRANT SELECT ON public.user_agreements_v1 TO authenticated;

-- Verify the view is using security_invoker (should already be set)
-- This ensures RLS policies from user_agreements table are enforced
ALTER VIEW public.user_agreements_v1 SET (security_invoker = true);