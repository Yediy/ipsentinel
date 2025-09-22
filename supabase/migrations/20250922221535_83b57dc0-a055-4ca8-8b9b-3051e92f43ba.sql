-- Fix the search_path security issue in sync_filing_documents function
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;