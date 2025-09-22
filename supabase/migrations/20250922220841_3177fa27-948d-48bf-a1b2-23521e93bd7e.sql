-- Enable RLS on filing_documents table
ALTER TABLE public.filing_documents ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view only their filing documents
CREATE POLICY "filing_documents_select_secure_access" 
ON public.filing_documents 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.filings f 
    WHERE f.id = filing_documents.filing_id 
    AND (
      (auth.uid() IS NOT NULL AND f.user_id = auth.uid()) OR 
      (f.user_id IS NULL AND f.contact_email IS NOT NULL AND auth.email() = f.contact_email) OR 
      public.is_admin()
    )
  )
);

-- Create policy for users to insert filing documents for their filings only
CREATE POLICY "filing_documents_insert_secure_access" 
ON public.filing_documents 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.filings f 
    WHERE f.id = filing_documents.filing_id 
    AND (
      (auth.uid() IS NOT NULL AND f.user_id = auth.uid()) OR 
      (f.user_id IS NULL AND f.contact_email IS NOT NULL AND auth.email() = f.contact_email) OR 
      public.is_admin()
    )
  )
);

-- Create policy for users to update filing documents for their filings only
CREATE POLICY "filing_documents_update_secure_access" 
ON public.filing_documents 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 
    FROM public.filings f 
    WHERE f.id = filing_documents.filing_id 
    AND (
      (auth.uid() IS NOT NULL AND f.user_id = auth.uid()) OR 
      (f.user_id IS NULL AND f.contact_email IS NOT NULL AND auth.email() = f.contact_email) OR 
      public.is_admin()
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.filings f 
    WHERE f.id = filing_documents.filing_id 
    AND (
      (auth.uid() IS NOT NULL AND f.user_id = auth.uid()) OR 
      (f.user_id IS NULL AND f.contact_email IS NOT NULL AND auth.email() = f.contact_email) OR 
      public.is_admin()
    )
  )
);

-- Create policy for users to delete filing documents for their filings only
CREATE POLICY "filing_documents_delete_secure_access" 
ON public.filing_documents 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 
    FROM public.filings f 
    WHERE f.id = filing_documents.filing_id 
    AND (
      (auth.uid() IS NOT NULL AND f.user_id = auth.uid()) OR 
      (f.user_id IS NULL AND f.contact_email IS NOT NULL AND auth.email() = f.contact_email) OR 
      public.is_admin()
    )
  )
);