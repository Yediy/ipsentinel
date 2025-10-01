-- Fix Security Definer View issue for user_agreements_v1
-- The view must be explicitly created with SECURITY INVOKER to use caller's permissions

-- Drop the existing view
DROP VIEW IF EXISTS public.user_agreements_v1;

-- Recreate the view with explicit SECURITY INVOKER
-- This ensures RLS policies from the underlying table are properly enforced
CREATE VIEW public.user_agreements_v1
WITH (security_invoker = true)
AS
SELECT 
  user_id,
  (
    tos_accepted_at IS NOT NULL 
    AND privacy_accepted_at IS NOT NULL 
    AND disclaimer_accepted_at IS NOT NULL
  ) AS accepted
FROM public.user_agreements
WHERE version = 'v1';

-- Grant access to authenticated and anonymous users
GRANT SELECT ON public.user_agreements_v1 TO anon, authenticated;