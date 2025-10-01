-- Add explicit policies to block anonymous access to profiles table
-- This makes it crystal clear that unauthenticated users cannot access user data

-- Block all anonymous SELECT access to profiles
CREATE POLICY "Block anonymous read access to profiles"
ON public.profiles
FOR SELECT
TO anon
USING (false);

-- Block all anonymous INSERT access to profiles
CREATE POLICY "Block anonymous insert access to profiles"
ON public.profiles
FOR INSERT
TO anon
WITH CHECK (false);

-- Block all anonymous UPDATE access to profiles
CREATE POLICY "Block anonymous update access to profiles"
ON public.profiles
FOR UPDATE
TO anon
USING (false)
WITH CHECK (false);

-- Block all anonymous DELETE access to profiles
CREATE POLICY "Block anonymous delete access to profiles"
ON public.profiles
FOR DELETE
TO anon
USING (false);