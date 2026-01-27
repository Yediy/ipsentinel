-- Fix payments_block_anon policy to be RESTRICTIVE for defense-in-depth
-- This provides stronger security guarantees than PERMISSIVE with USING(false)

-- Drop the existing PERMISSIVE policy
DROP POLICY IF EXISTS "payments_block_anon" ON public.payments;

-- Recreate as RESTRICTIVE policy (matches pattern on profiles, documents, etc.)
CREATE POLICY "payments_block_anon" ON public.payments
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- Add comment explaining the security pattern
COMMENT ON POLICY "payments_block_anon" ON public.payments IS 
  'RESTRICTIVE policy that explicitly blocks ALL anonymous access to payments. Combined with authenticated-only policies for legitimate access.';