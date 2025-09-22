-- Update documents table RLS policies to match secure filings pattern
-- Current policies don't handle anonymous filings with contact_email

-- Drop existing insecure policies
DROP POLICY IF EXISTS "documents_select_owner_or_admin" ON public.documents;
DROP POLICY IF EXISTS "documents_insert_owner" ON public.documents;
DROP POLICY IF EXISTS "documents_delete_owner_or_admin" ON public.documents;
DROP POLICY IF EXISTS "documents_update_admin_only" ON public.documents;

-- Create secure SELECT policy matching filings pattern
CREATE POLICY "documents_select_secure_access" 
ON public.documents 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.filings f 
    WHERE f.id = documents.filing_id 
    AND (
      (auth.uid() IS NOT NULL AND f.user_id = auth.uid()) OR 
      (f.user_id IS NULL AND f.contact_email IS NOT NULL AND auth.email() = f.contact_email) OR 
      is_admin()
    )
  )
);

-- Create secure INSERT policy
CREATE POLICY "documents_insert_secure_access" 
ON public.documents 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.filings f 
    WHERE f.id = documents.filing_id 
    AND (
      (auth.uid() IS NOT NULL AND f.user_id = auth.uid()) OR 
      (f.user_id IS NULL AND f.contact_email IS NOT NULL AND auth.email() = f.contact_email) OR 
      is_admin()
    )
  )
);

-- Create secure UPDATE policy (admin only for document integrity)
CREATE POLICY "documents_update_admin_only" 
ON public.documents 
FOR UPDATE 
USING (is_admin())
WITH CHECK (is_admin());

-- Create secure DELETE policy
CREATE POLICY "documents_delete_secure_access" 
ON public.documents 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.filings f 
    WHERE f.id = documents.filing_id 
    AND (
      (auth.uid() IS NOT NULL AND f.user_id = auth.uid()) OR 
      (f.user_id IS NULL AND f.contact_email IS NOT NULL AND auth.email() = f.contact_email) OR 
      is_admin()
    )
  )
);