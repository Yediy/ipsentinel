-- CRITICAL SECURITY FIX: Fix payments table RLS policies to prevent anonymous access
-- Issue: Current policy allows access to payments with NULL filing_id, exposing sensitive financial data

-- Drop the problematic SELECT policy that allows access to payments with NULL filing_id
DROP POLICY IF EXISTS "payments_select_owner_or_admin" ON public.payments;

-- Create a new, secure SELECT policy that:
-- 1. Requires authentication (no anonymous access)
-- 2. Removes the dangerous (filing_id IS NULL) condition
-- 3. Only allows users to see payments for their own filings or admins to see all
CREATE POLICY "payments_select_authenticated_owner_or_admin" 
ON public.payments 
FOR SELECT 
TO authenticated
USING (
  -- User must be authenticated
  auth.uid() IS NOT NULL
  AND (
    -- Either user is admin (can see all payments)
    is_admin()
    OR 
    -- Or user owns the filing associated with this payment
    (
      filing_id IS NOT NULL 
      AND EXISTS (
        SELECT 1 
        FROM filings f 
        WHERE f.id = payments.filing_id 
          AND f.user_id = auth.uid()
      )
    )
  )
);

-- Also strengthen the INSERT policy to be more explicit about authentication
DROP POLICY IF EXISTS "payments_insert_authenticated" ON public.payments;

CREATE POLICY "payments_insert_authenticated_users_only" 
ON public.payments 
FOR INSERT 
TO authenticated
WITH CHECK (
  -- User must be authenticated
  auth.uid() IS NOT NULL
  AND (
    -- Either user is admin (can create any payment)
    is_admin()
    OR
    -- Or user owns the filing this payment is for
    (
      filing_id IS NOT NULL
      AND EXISTS (
        SELECT 1 
        FROM filings f 
        WHERE f.id = payments.filing_id 
          AND f.user_id = auth.uid()
      )
    )
  )
);

-- Add security documentation
COMMENT ON TABLE public.payments IS 
'SECURITY: Contains sensitive financial data including payment amounts, session IDs, and raw payment provider data. Access is strictly controlled through RLS policies. Only authenticated users who own the associated filing or admins can access payment records. Anonymous access is completely blocked.';

-- Log the security fix
DO $$
BEGIN
  RAISE NOTICE 'CRITICAL SECURITY FIX APPLIED: Removed dangerous NULL filing_id condition from payments SELECT policy. Anonymous access to payment data is now completely blocked. Only authenticated users who own the filing or admins can access payment records.';
END $$;