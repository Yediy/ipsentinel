-- Remove remaining insecure RLS policies on filings table
-- The old policies are too permissive and create security vulnerabilities

-- Drop all remaining old insecure policies
DROP POLICY IF EXISTS "filings_select_authenticated_owner_or_admin" ON public.filings;
DROP POLICY IF EXISTS "filings_update_authenticated_owner_or_admin" ON public.filings;  
DROP POLICY IF EXISTS "filings_delete_authenticated_owner_or_admin" ON public.filings;
DROP POLICY IF EXISTS "filings_insert_authenticated_owner" ON public.filings;

-- Create secure delete policy to replace the insecure one
CREATE POLICY "filings_delete_secure_access" 
ON public.filings 
FOR DELETE 
USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR 
  (user_id IS NULL AND contact_email IS NOT NULL AND auth.email() = contact_email) OR 
  is_admin()
);