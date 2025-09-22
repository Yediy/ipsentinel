-- Harden profiles table security: force RLS, revoke anon access, and scope policies to authenticated/admin only
BEGIN;

-- Ensure RLS is enabled and enforced
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- Revoke broad privileges to eliminate anonymous/public access
REVOKE ALL ON TABLE public.profiles FROM anon;
REVOKE ALL ON TABLE public.profiles FROM PUBLIC;

-- Grant minimal necessary privileges to authenticated users
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;

-- Drop existing policies to replace with stricter versions
DROP POLICY IF EXISTS "profiles_delete_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_self_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self_or_admin" ON public.profiles;

-- Authenticated users: can read their own profile; admins can read all
CREATE POLICY "profiles_select_self_or_admin"
ON public.profiles
AS PERMISSIVE
FOR SELECT
TO authenticated
USING ((user_id = auth.uid()) OR is_admin());

-- Authenticated users: can insert their own profile
CREATE POLICY "profiles_insert_self"
ON public.profiles
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Authenticated users: can update their own profile; admins can update all
CREATE POLICY "profiles_update_self_or_admin"
ON public.profiles
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING ((user_id = auth.uid()) OR is_admin())
WITH CHECK ((user_id = auth.uid()) OR is_admin());

-- Only admins can delete profiles
CREATE POLICY "profiles_delete_admin_only"
ON public.profiles
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (is_admin());

COMMIT;