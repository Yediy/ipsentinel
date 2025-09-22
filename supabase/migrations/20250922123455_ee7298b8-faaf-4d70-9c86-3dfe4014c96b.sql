-- Add notification trigger for new documents
CREATE OR REPLACE FUNCTION public.notify_on_new_document()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE 
  uid uuid;
BEGIN
  SELECT user_id INTO uid FROM public.filings WHERE id = NEW.filing_id;
  IF uid IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, kind, title, body)
    VALUES (uid, 'info', 'New document added', COALESCE(NEW.kind::text, 'doc') || ' ready: ' || LEFT(NEW.url, 140));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_documents_notify ON public.documents;
CREATE TRIGGER trg_documents_notify
AFTER INSERT ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_document();