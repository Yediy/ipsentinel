-- Simple security fix for profiles table
-- Make user_id NOT NULL to prevent RLS bypass scenarios

ALTER TABLE public.profiles 
ALTER COLUMN user_id SET NOT NULL;