-- 1) DB: auto-compute deadlines on filings create/update
CREATE OR REPLACE FUNCTION public.compute_deadlines_for_filing(fid uuid)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE 
  prio date; 
  cc text; 
  months int;
BEGIN
  SELECT priority_date, upper(country_code) INTO prio, cc FROM public.filings WHERE id=fid;
  IF prio IS NULL THEN RETURN; END IF;
  
  months := COALESCE((SELECT CASE cc 
    WHEN 'CN' THEN 30 
    WHEN 'EP' THEN 31 
    WHEN 'GB' THEN 31 
    WHEN 'JP' THEN 30 
    WHEN 'KR' THEN 31 
    WHEN 'US' THEN 30 
    ELSE 30 END), 30);

  -- Insert Paris deadline if not exists
  INSERT INTO public.deadlines(id, filing_id, label, due_on, done)
  VALUES (gen_random_uuid(), fid, 'Paris 12-month deadline', prio + interval '12 months', false)
  ON CONFLICT (filing_id, label) DO NOTHING;

  -- Insert PCT national/regional deadline if not exists  
  INSERT INTO public.deadlines(id, filing_id, label, due_on, done)
  VALUES (gen_random_uuid(), fid, 'PCT national/regional entry', prio + (months || ' months')::interval, false)
  ON CONFLICT (filing_id, label) DO NOTHING;

  -- Refresh the upcoming deadlines materialized view
  PERFORM public.refresh_upcoming_deadlines(fid);
END $$;

-- Create trigger function for filings changes
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

-- Create the trigger
DROP TRIGGER IF EXISTS trg_filings_deadlines ON public.filings;
CREATE TRIGGER trg_filings_deadlines
  AFTER INSERT OR UPDATE OF priority_date, country_code ON public.filings
  FOR EACH ROW 
  EXECUTE FUNCTION public.on_filings_change();

-- Add unique constraint to prevent duplicate deadlines
ALTER TABLE public.deadlines 
ADD CONSTRAINT deadlines_filing_label_unique 
UNIQUE (filing_id, label);