-- Fix critical security vulnerability in filings table RLS policies
-- Remove insecure policies that don't require authentication

-- Drop the insecure policies that allow potential public access
DROP POLICY IF EXISTS "filings_select_owner_or_admin" ON public.filings;
DROP POLICY IF EXISTS "filings_update_owner_or_admin" ON public.filings;
DROP POLICY IF EXISTS "filings_insert_owner" ON public.filings;

-- Ensure only secure authenticated policies remain and add proper email-based access for anonymous filings
-- Update the authenticated policies to also handle anonymous filings via email verification

-- Policy for SELECT: Users can view their own filings or filings they created via email
CREATE POLICY "filings_select_secure_access" 
ON public.filings 
FOR SELECT 
USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR 
  (user_id IS NULL AND contact_email IS NOT NULL AND auth.email() = contact_email) OR 
  is_admin()
);

-- Policy for UPDATE: Users can update their own filings or filings they created via email  
CREATE POLICY "filings_update_secure_access" 
ON public.filings 
FOR UPDATE 
USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR 
  (user_id IS NULL AND contact_email IS NOT NULL AND auth.email() = contact_email) OR 
  is_admin()
)
WITH CHECK (
  (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR 
  (user_id IS NULL AND contact_email IS NOT NULL AND auth.email() = contact_email) OR 
  is_admin()
);

-- Policy for INSERT: Only authenticated users can create filings with their user_id
-- Or anonymous users can create filings with contact_email verification
CREATE POLICY "filings_insert_secure_access" 
ON public.filings 
FOR INSERT 
WITH CHECK (
  (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR 
  (user_id IS NULL AND contact_email IS NOT NULL AND contact_email = auth.email())
);