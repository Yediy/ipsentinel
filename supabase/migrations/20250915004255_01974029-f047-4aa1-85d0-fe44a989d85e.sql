-- Fix security linter issues: SECURITY DEFINER view and function search path

-- =========================
-- Fix SECURITY DEFINER view issue (0010)
-- =========================
-- Drop the existing view that has SECURITY DEFINER (implicit default)
DROP VIEW IF EXISTS public.upcoming_deadlines;

-- Recreate the view with explicit SECURITY INVOKER to use the querying user's permissions
-- This ensures RLS policies are properly enforced
CREATE VIEW public.upcoming_deadlines 
WITH (security_invoker=true)
AS
SELECT d.*, f.user_id, f.country_code, f.route, f.type
FROM public.deadlines d
JOIN public.filings f ON f.id = d.filing_id
WHERE d.done = false
  AND d.due_on >= (current_date)
ORDER BY d.due_on ASC;

-- =========================
-- Fix function search path issues (0011)
-- =========================
-- Update set_updated_at function to have explicit search_path
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- The is_admin() function already has search_path set, but let's ensure it's optimal
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.role = 'admin'
  );
$$;

-- Grant proper permissions on the view
GRANT SELECT ON public.upcoming_deadlines TO authenticated;

-- Add security documentation
COMMENT ON VIEW public.upcoming_deadlines IS 'SECURITY: Uses security_invoker=true to enforce RLS policies from the querying user context';
COMMENT ON FUNCTION public.set_updated_at() IS 'SECURITY: Explicit search_path prevents potential schema injection attacks';
COMMENT ON FUNCTION public.is_admin() IS 'SECURITY: Explicit search_path and security_definer for admin role checking';