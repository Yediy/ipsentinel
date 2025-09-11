-- Fix the profiles table security issue with targeted changes
-- The main issue is that user_id was nullable, which could bypass RLS

-- First, make user_id NOT NULL to prevent RLS bypass
ALTER TABLE public.profiles 
ALTER COLUMN user_id SET NOT NULL;

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'profiles' 
        AND constraint_name = 'profiles_user_id_unique'
    ) THEN
        ALTER TABLE public.profiles 
        ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);
    END IF;
END $$;

-- Update the RLS policies to be more explicit and secure
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create more secure RLS policies with explicit role targeting
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

-- Add security comments
COMMENT ON TABLE public.profiles IS 'User profile data with strict RLS policies - users can only access their own profile';
COMMENT ON COLUMN public.profiles.user_id IS 'NOT NULL - ensures RLS security by preventing null-based bypass';