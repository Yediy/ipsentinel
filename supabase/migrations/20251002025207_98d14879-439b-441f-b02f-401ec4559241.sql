-- Fix profiles RLS policies: Remove overly restrictive "Block anonymous" policies
-- These policies were blocking ALL access (even authenticated users) due to USING condition: false

-- Drop the problematic blocking policies
DROP POLICY IF EXISTS "Block anonymous read access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Block anonymous insert access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Block anonymous update access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Block anonymous delete access to profiles" ON public.profiles;

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Keep existing secure policies (these are correctly configured):
-- profiles_select_self_or_admin: Users can read their own profile or admins can read all
-- profiles_insert_self: Users can only insert their own profile
-- profiles_update_self_basic: Users can update their own profile (with role protection)
-- profiles_delete_admin_only: Only admins can delete profiles

-- Add a policy to block service role from bypassing RLS (force service role to use policies)
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;