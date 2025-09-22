-- Fix critical security vulnerability: Add RLS policies for filing_documents table
-- This table was completely exposed without any access control

-- Enable RLS on filing_documents table
ALTER TABLE public.filing_documents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view documents for their own filings
CREATE POLICY "Users can view documents for their filings" 
ON public.filing_documents 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.filings f 
    WHERE f.id = filing_documents.filing_id 
    AND (
      f.user_id = auth.uid() 
      OR (f.user_id IS NULL AND f.contact_email IS NOT NULL AND auth.email() = f.contact_email)
      OR is_admin()
    )
  )
);

-- Policy: Users can insert documents for their own filings
CREATE POLICY "Users can insert documents for their filings" 
ON public.filing_documents 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.filings f 
    WHERE f.id = filing_documents.filing_id 
    AND f.user_id = auth.uid()
  )
);

-- Policy: Only admins can update documents
CREATE POLICY "Admins can update documents" 
ON public.filing_documents 
FOR UPDATE 
USING (is_admin())
WITH CHECK (is_admin());

-- Policy: Only admins can delete documents  
CREATE POLICY "Admins can delete documents" 
ON public.filing_documents 
FOR DELETE 
USING (is_admin());

-- Policy: Service role has full access for system operations
CREATE POLICY "Service role has full access to documents" 
ON public.filing_documents 
FOR ALL 
USING (current_setting('role') = 'service_role')
WITH CHECK (current_setting('role') = 'service_role');