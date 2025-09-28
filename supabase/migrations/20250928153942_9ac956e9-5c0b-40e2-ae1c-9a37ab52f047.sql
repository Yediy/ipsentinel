-- Fix security issues from linter

-- Fix function search path issues by adding SET search_path
CREATE OR REPLACE FUNCTION public.compute_deadlines_for_filing(filing_id UUID)
RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  filing_record RECORD;
  paris_deadline DATE;
  pct_deadline DATE;
BEGIN
  -- Get filing details
  SELECT * INTO filing_record FROM public.filings WHERE id = filing_id;
  
  IF filing_record IS NULL OR filing_record.priority_date IS NULL THEN
    RETURN;
  END IF;
  
  -- Calculate Paris Convention deadline (12 months)
  paris_deadline := filing_record.priority_date + INTERVAL '12 months';
  
  -- Calculate PCT national phase deadline (30-31 months depending on country)
  CASE filing_record.country_code
    WHEN 'EP' THEN pct_deadline := filing_record.priority_date + INTERVAL '31 months';
    WHEN 'GB' THEN pct_deadline := filing_record.priority_date + INTERVAL '31 months';
    WHEN 'KR' THEN pct_deadline := filing_record.priority_date + INTERVAL '31 months';
    ELSE pct_deadline := filing_record.priority_date + INTERVAL '30 months';
  END CASE;
  
  -- Insert Paris deadline if not exists
  INSERT INTO public.deadlines (filing_id, label, due_on, done)
  VALUES (
    filing_id,
    'Paris Convention 12-month deadline',
    paris_deadline,
    false
  )
  ON CONFLICT (filing_id, label) DO NOTHING;
  
  -- Insert PCT deadline if route is PCT
  IF filing_record.route = 'pct' THEN
    INSERT INTO public.deadlines (filing_id, label, due_on, done)
    VALUES (
      filing_id,
      'PCT national/regional phase entry',
      pct_deadline,
      false
    )
    ON CONFLICT (filing_id, label) DO NOTHING;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_compute_deadlines()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Only compute if priority_date is set
  IF NEW.priority_date IS NOT NULL THEN
    PERFORM public.compute_deadlines_for_filing(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;