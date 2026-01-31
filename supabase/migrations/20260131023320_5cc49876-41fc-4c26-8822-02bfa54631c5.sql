-- Add ownership verification to compute_deadlines_for_filing function
CREATE OR REPLACE FUNCTION public.compute_deadlines_for_filing(filing_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  filing_record RECORD;
  paris_deadline DATE;
  pct_deadline DATE;
  calling_user_id uuid;
BEGIN
  -- Get the calling user (NULL in service role context)
  calling_user_id := auth.uid();
  
  -- Get filing details
  SELECT * INTO filing_record FROM public.filings WHERE id = filing_id;
  
  IF filing_record IS NULL OR filing_record.priority_date IS NULL THEN
    RETURN;
  END IF;
  
  -- Ownership verification: allow if service role (auth.uid() is NULL) OR user owns the filing OR user is admin
  IF calling_user_id IS NOT NULL THEN
    IF filing_record.user_id != calling_user_id THEN
      -- Check if user is admin
      IF NOT EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = calling_user_id 
        AND ur.role = 'admin'::app_role
      ) THEN
        RAISE EXCEPTION 'Unauthorized: Cannot compute deadlines for filing you do not own';
      END IF;
    END IF;
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
$function$;