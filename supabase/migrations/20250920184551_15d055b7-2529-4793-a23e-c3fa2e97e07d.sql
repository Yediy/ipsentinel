-- Fix security issue: Add RLS policies for upcoming_deadlines view
-- The upcoming_deadlines table/view currently has no RLS policies
-- This allows unauthorized access to user deadline information

-- Enable RLS on upcoming_deadlines if it's a table
ALTER TABLE public.upcoming_deadlines ENABLE ROW LEVEL SECURITY;

-- Add policy to restrict access to users' own deadline data
CREATE POLICY "Users can view their own upcoming deadlines" 
ON public.upcoming_deadlines 
FOR SELECT 
USING (auth.uid() = user_id);

-- Add policy for admins to view all deadlines
CREATE POLICY "Admins can view all upcoming deadlines" 
ON public.upcoming_deadlines 
FOR SELECT 
USING (public.is_admin());