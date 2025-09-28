-- Drop existing function with different parameter name
DROP FUNCTION IF EXISTS public.compute_deadlines_for_filing(uuid);

-- Add user agreements tracking (already exists, skip if table exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_agreements') THEN
        CREATE TABLE public.user_agreements (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          tos_accepted_at TIMESTAMP WITH TIME ZONE,
          privacy_accepted_at TIMESTAMP WITH TIME ZONE,
          disclaimer_accepted_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          version TEXT NOT NULL DEFAULT 'v1'
        );
        
        -- Enable RLS
        ALTER TABLE public.user_agreements ENABLE ROW LEVEL SECURITY;
        
        -- RLS policies for user agreements
        CREATE POLICY "Users can view their own agreements" ON public.user_agreements
          FOR SELECT USING (auth.uid() = user_id);

        CREATE POLICY "Users can insert their own agreements" ON public.user_agreements
          FOR INSERT WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can update their own agreements" ON public.user_agreements
          FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Recreate deadline computation function with correct parameter
CREATE OR REPLACE FUNCTION public.compute_deadlines_for_filing(filing_id UUID)
RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger to auto-compute deadlines when filing is created/updated
DROP TRIGGER IF EXISTS compute_deadlines_on_filing_change ON public.filings;

CREATE OR REPLACE FUNCTION public.trigger_compute_deadlines()
RETURNS TRIGGER AS $$
BEGIN
  -- Only compute if priority_date is set
  IF NEW.priority_date IS NOT NULL THEN
    PERFORM public.compute_deadlines_for_filing(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER compute_deadlines_on_filing_change
  AFTER INSERT OR UPDATE OF priority_date, route, country_code
  ON public.filings
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_compute_deadlines();

-- Add translated content columns to filings
ALTER TABLE public.filings 
ADD COLUMN IF NOT EXISTS title_zh TEXT,
ADD COLUMN IF NOT EXISTS abstract_zh TEXT,
ADD COLUMN IF NOT EXISTS detailed_description_zh TEXT,
ADD COLUMN IF NOT EXISTS claims_zh TEXT;