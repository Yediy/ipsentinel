-- Drop the existing view
DROP VIEW IF EXISTS public.filing_documents;

-- Create filing_documents as a proper table
CREATE TABLE public.filing_documents (
  id uuid NOT NULL,
  filing_id uuid NOT NULL,
  kind doc_kind NOT NULL,
  url text NOT NULL,
  sha256 text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Enable RLS on the new table
ALTER TABLE public.filing_documents ENABLE ROW LEVEL SECURITY;

-- Populate the table with data from documents
INSERT INTO public.filing_documents (id, filing_id, kind, url, sha256, created_at)
SELECT d.id, d.filing_id, d.kind, d.url, d.sha256, d.created_at
FROM public.documents d;

-- Create RLS policies for secure access
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
);

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

-- Create trigger to sync with documents table on insert/update/delete
CREATE OR REPLACE FUNCTION public.sync_filing_documents()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.filing_documents (id, filing_id, kind, url, sha256, created_at)
    VALUES (NEW.id, NEW.filing_id, NEW.kind, NEW.url, NEW.sha256, NEW.created_at);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.filing_documents 
    SET filing_id = NEW.filing_id, kind = NEW.kind, url = NEW.url, sha256 = NEW.sha256, created_at = NEW.created_at
    WHERE id = NEW.id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.filing_documents WHERE id = OLD.id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers to keep filing_documents in sync with documents
CREATE TRIGGER sync_filing_documents_insert
  AFTER INSERT ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.sync_filing_documents();

CREATE TRIGGER sync_filing_documents_update
  AFTER UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.sync_filing_documents();

CREATE TRIGGER sync_filing_documents_delete
  AFTER DELETE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.sync_filing_documents();