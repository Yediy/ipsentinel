-- Fix the security definer view issue by recreating it without security definer
DROP VIEW IF EXISTS public.user_agreements_v1;

-- Create the view properly without security definer
CREATE VIEW public.user_agreements_v1 AS
SELECT 
  user_id,
  (tos_accepted_at IS NOT NULL AND 
   privacy_accepted_at IS NOT NULL AND 
   disclaimer_accepted_at IS NOT NULL) AS accepted
FROM public.user_agreements
WHERE version = 'v1';

-- Add RLS policies for the view by granting access
GRANT SELECT ON public.user_agreements_v1 TO anon, authenticated;