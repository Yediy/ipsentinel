-- Fix critical security vulnerability in filing_documents table
-- Enable RLS and create secure access policies

-- Enable Row Level Security on filing_documents table
ALTER TABLE public.filing_documents ENABLE ROW LEVEL SECURITY;

-- Create secure SELECT policy - users can view documents for their filings
CREATE POLICY "filing_documents_select_secure_access" 
ON public.filing_documents 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.filings f 
    WHERE f.id = filing_documents.filing_id 
    AND (
      (auth.uid() IS NOT NULL AND f.user_id = auth.uid()) OR 
      (f.user_id IS NULL AND f.contact_email IS NOT NULL AND auth.email() = f.contact_email) OR 
      is_admin()
    )
  )
);

-- Create secure INSERT policy - users can add documents to their filings
CREATE POLICY "filing_documents_insert_secure_access" 
ON public.filing_documents 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.filings f 
    WHERE f.id = filing_documents.filing_id 
    AND (
      (auth.uid() IS NOT NULL AND f.user_id = auth.uid()) OR 
      (f.user_id IS NULL AND f.contact_email IS NOT NULL AND auth.email() = f.contact_email) OR 
      is_admin()
    )
  )
);

-- Create secure UPDATE policy - users can update documents for their filings
CREATE POLICY "filing_documents_update_secure_access" 
ON public.filing_documents 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.filings f 
    WHERE f.id = filing_documents.filing_id 
    AND (
      (auth.uid() IS NOT NULL AND f.user_id = auth.uid()) OR 
      (f.user_id IS NULL AND f.contact_email IS NOT NULL AND auth.email() = f.contact_email) OR 
      is_admin()
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.filings f 
    WHERE f.id = filing_documents.filing_id 
    AND (
      (auth.uid() IS NOT NULL AND f.user_id = auth.uid()) OR 
      (f.user_id IS NULL AND f.contact_email IS NOT NULL AND auth.email() = f.contact_email) OR 
      is_admin()
    )
  )
);

-- Create secure DELETE policy - users can delete documents from their filings
CREATE POLICY "filing_documents_delete_secure_access" 
ON public.filing_documents 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.filings f 
    WHERE f.id = filing_documents.filing_id 
    AND (
      (auth.uid() IS NOT NULL AND f.user_id = auth.uid()) OR 
      (f.user_id IS NULL AND f.contact_email IS NOT NULL AND auth.email() = f.contact_email) OR 
      is_admin()
    )
  )
);