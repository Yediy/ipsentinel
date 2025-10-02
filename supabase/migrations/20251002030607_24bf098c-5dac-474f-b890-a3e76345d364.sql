-- Remove old duplicate policies that were allowing public access to profiles
-- These policies apply to 'public' role which includes anonymous users

DROP POLICY IF EXISTS "profiles self read" ON public.profiles;
DROP POLICY IF EXISTS "profiles self insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles self update" ON public.profiles;

-- The correct policies (already in place) are:
-- profiles_select_self_or_admin (authenticated only)
-- profiles_insert_self (authenticated only)  
-- profiles_update_self_basic (authenticated only)
-- profiles_delete_admin_only (authenticated only)