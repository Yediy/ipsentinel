-- Fix sync_filing_documents to add explicit ownership verification
-- This addresses the SECURITY DEFINER bypass vulnerability

CREATE OR REPLACE FUNCTION public.sync_filing_documents()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  filing_owner_id uuid;
BEGIN
  -- Get the filing owner
  SELECT user_id INTO filing_owner_id 
  FROM public.filings 
  WHERE id = COALESCE(NEW.filing_id, OLD.filing_id);
  
  -- Verify ownership (allow if user owns the filing OR if called from service role context)
  -- auth.uid() returns NULL in service role context, which we allow for backend operations
  IF auth.uid() IS NOT NULL AND (filing_owner_id IS NULL OR filing_owner_id != auth.uid()) THEN
    -- Check if user is admin
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin'::app_role
    ) THEN
      RAISE EXCEPTION 'Unauthorized: Cannot sync documents for filing you do not own';
    END IF;
  END IF;

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
$$;