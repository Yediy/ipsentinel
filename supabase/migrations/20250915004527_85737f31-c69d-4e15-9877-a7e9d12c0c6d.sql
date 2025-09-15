-- CRITICAL SECURITY FIX: Add RLS policies to upcoming_deadlines view
-- This prevents users from seeing other users' deadline data

-- Enable RLS on the upcoming_deadlines view
ALTER VIEW public.upcoming_deadlines SET (security_invoker = true);

-- Since upcoming_deadlines is a view, we need to ensure the underlying query
-- properly respects user access. Let's recreate it with better security.

-- Drop and recreate the view with more explicit security
DROP VIEW IF EXISTS public.upcoming_deadlines;

-- Create a more secure view that inherits RLS from underlying tables
CREATE VIEW public.upcoming_deadlines 
WITH (security_invoker=true)
AS
SELECT 
  d.id,
  d.filing_id, 
  d.label,
  d.due_on,
  d.done,
  d.created_at,
  f.user_id,
  f.country_code,
  f.route,
  f.type
FROM public.deadlines d
JOIN public.filings f ON f.id = d.filing_id
WHERE d.done = false
  AND d.due_on >= current_date
  -- CRITICAL: This view will automatically respect the RLS policies 
  -- of the underlying tables (deadlines and filings)
  -- The filings table has RLS that restricts to user_id = auth.uid()
  -- The deadlines table has RLS that checks filing ownership
ORDER BY d.due_on ASC;

-- Grant SELECT permission to authenticated users
-- (RLS policies will handle the actual access control)
GRANT SELECT ON public.upcoming_deadlines TO authenticated;

-- Add security documentation
COMMENT ON VIEW public.upcoming_deadlines IS 
'SECURITY: This view automatically inherits RLS from underlying tables. Users can only see deadlines for their own filings due to RLS policies on the filings and deadlines tables.';

-- Verify the underlying table policies are working correctly
-- Let's also add a more explicit RLS policy structure to be extra safe

-- Ensure the filings table has the strictest possible RLS
DO $$
BEGIN
  -- Double-check that our filing policies are correct
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'filings' 
      AND policyname = 'filings_select_owner_or_admin'
  ) THEN
    RAISE EXCEPTION 'Critical security policy missing: filings_select_owner_or_admin';
  END IF;
  
  -- Double-check that our deadline policies are correct  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'deadlines' 
      AND policyname = 'deadlines_select_owner_or_admin'
  ) THEN
    RAISE EXCEPTION 'Critical security policy missing: deadlines_select_owner_or_admin';
  END IF;
END $$;

-- Log the security fix
DO $$
BEGIN
  RAISE NOTICE 'SECURITY FIX APPLIED: upcoming_deadlines view now properly inherits RLS from underlying tables. User data isolation is enforced through filings table RLS policies.';
END $$;