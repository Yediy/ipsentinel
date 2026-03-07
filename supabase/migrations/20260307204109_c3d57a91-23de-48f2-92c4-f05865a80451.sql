CREATE OR REPLACE FUNCTION public.notify_on_new_document()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE 
  uid uuid;
BEGIN
  SELECT user_id INTO uid FROM public.filings WHERE id = NEW.filing_id;
  IF uid IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, type, title, message)
    VALUES (uid, 'info', 'New document added', COALESCE(NEW.kind::text, 'doc') || ' ready: ' || LEFT(NEW.url, 140));
  END IF;
  RETURN NEW;
END $function$;