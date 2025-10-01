-- Fix user_agreements_v1 permissions - grant only SELECT to authenticated
-- Currently authenticated users have all privileges, but should only have read access

-- Revoke all privileges from authenticated users
REVOKE ALL ON public.user_agreements_v1 FROM authenticated;

-- Grant only SELECT privilege to authenticated users
-- The base table RLS policies will ensure users only see their own data
GRANT SELECT ON public.user_agreements_v1 TO authenticated;