-- First, let's check if there are any profiles with NULL user_id that could cause RLS bypass
-- Then fix the security issue by making user_id NOT NULL and adding a unique constraint

-- Check current data integrity
DO $$
BEGIN
    -- Check for any profiles with NULL user_id
    IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id IS NULL) THEN
        RAISE EXCEPTION 'Found profiles with NULL user_id. Please clean up data before applying security fix.';
    END IF;
END $$;

-- Fix the security vulnerability by making user_id NOT NULL
-- This prevents any potential RLS bypass scenarios
ALTER TABLE public.profiles 
ALTER COLUMN user_id SET NOT NULL;

-- Add unique constraint to ensure one profile per user
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);

-- Add a foreign key constraint for referential integrity
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update the RLS policies to be more explicit and secure
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create more secure RLS policies
CREATE POLICY "Users can view only their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert only their own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update only their own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Prevent profile deletion for data integrity
CREATE POLICY "Prevent profile deletion" 
ON public.profiles 
FOR DELETE 
TO authenticated
USING (false);

-- Add helpful comment
COMMENT ON TABLE public.profiles IS 'User profile data with strict RLS policies - users can only access their own profile';
COMMENT ON COLUMN public.profiles.user_id IS 'NOT NULL foreign key to auth.users(id) - ensures RLS security';