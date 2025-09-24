-- Fix security issue: Remove SECURITY DEFINER from view and make it a regular view
DROP VIEW IF EXISTS public.user_agreements_v1;

CREATE VIEW public.user_agreements_v1 AS
SELECT user_id,
       (tos_accepted_at IS NOT NULL) AND
       (privacy_accepted_at IS NOT NULL) AND
       (disclaimer_accepted_at IS NOT NULL) AS accepted
FROM public.user_agreements
WHERE version = 'v1';

-- Enable RLS on the view
ALTER VIEW public.user_agreements_v1 SET (security_barrier = true);

GRANT SELECT ON public.user_agreements_v1 TO anon, authenticated;