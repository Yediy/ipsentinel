-- Add missing database triggers for auto-computing deadlines
CREATE OR REPLACE FUNCTION public.on_filings_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.compute_deadlines_for_filing(COALESCE(NEW.id, OLD.id));
  RETURN NEW;
END $$;

-- Create trigger for filings changes
DROP TRIGGER IF EXISTS trg_filings_deadlines ON public.filings;
CREATE TRIGGER trg_filings_deadlines
  AFTER INSERT OR UPDATE OF priority_date, country_code ON public.filings
  FOR EACH ROW EXECUTE FUNCTION public.on_filings_change();

-- Create trigger for deadlines changes  
CREATE OR REPLACE FUNCTION public.on_deadlines_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.refresh_upcoming_deadlines(NEW.filing_id);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_deadlines_refresh ON public.deadlines;
CREATE TRIGGER trg_deadlines_refresh
  AFTER INSERT OR UPDATE ON public.deadlines
  FOR EACH ROW EXECUTE FUNCTION public.on_deadlines_change();

-- Ensure sync trigger exists for documents
DROP TRIGGER IF EXISTS trg_documents_sync ON public.documents;
CREATE TRIGGER trg_documents_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.sync_filing_documents();