-- Fix critical security vulnerability in filings table RLS policy
-- Current policy allows ANY authenticated user to view anonymous filings
-- This exposes sensitive IP data including patent claims and trademark details

-- Drop the existing vulnerable policy
DROP POLICY IF EXISTS "Users can view their own filings" ON public.filings;

-- Create a secure policy that only allows access when:
-- 1. The authenticated user owns the filing (user_id matches)
-- 2. OR for anonymous filings, the authenticated user's email matches the contact_email
CREATE POLICY "Users can view their own filings" 
ON public.filings 
FOR SELECT 
TO authenticated
USING (
  -- User owns the filing directly
  (auth.uid() = user_id) 
  OR 
  -- Anonymous filing where authenticated user's email matches contact_email
  (user_id IS NULL AND contact_email IS NOT NULL AND auth.email() = contact_email)
);