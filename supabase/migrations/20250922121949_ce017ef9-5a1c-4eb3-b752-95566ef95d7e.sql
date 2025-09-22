-- Fix security warnings from linter

-- Fix function search path issues
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN 
  NEW.updated_at = now(); 
  RETURN NEW; 
END $$;

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

CREATE OR REPLACE FUNCTION public.refresh_upcoming_deadlines(_filing_id uuid DEFAULT NULL)
RETURNS void 
LANGUAGE sql 
SECURITY DEFINER
SET search_path = public
AS $$
  -- blow away and reinsert relevant rows
  WITH target AS (
    SELECT d.id as did, f.id as fid
    FROM public.deadlines d JOIN public.filings f ON f.id=d.filing_id
    WHERE (_filing_id IS NULL OR f.id=_filing_id) AND d.done=false AND d.due_on >= current_date
  )
  DELETE FROM public.upcoming_deadlines u
  USING target t
  WHERE u.filing_id = t.fid;

  INSERT INTO public.upcoming_deadlines (id, filing_id, label, due_on, done, user_id, country_code, route, filing_type, refreshed_at)
  SELECT uuid_generate_v4(), f.id, d.label, d.due_on, d.done, f.user_id, f.country_code, f.route, f.type, now()
  FROM public.deadlines d
  JOIN public.filings f ON f.id = d.filing_id
  WHERE (_filing_id IS NULL OR f.id=_filing_id)
    AND d.done=false AND d.due_on >= current_date;
$$;

-- Fix view security issue by adding security_invoker
ALTER VIEW public.filing_documents SET (security_invoker = on);