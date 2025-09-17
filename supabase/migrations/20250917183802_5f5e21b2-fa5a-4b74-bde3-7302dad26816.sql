-- CRITICAL SECURITY FIX: Fix payments table RLS policies to prevent anonymous access
-- Issue: Current policies may apply to 'public' role which includes anonymous users
-- This could expose sensitive financial transaction data to unauthorized users

-- Drop all existing policies on payments table
DROP POLICY IF EXISTS "payments_select_authenticated_owner_or_admin" ON public.payments;
DROP POLICY IF EXISTS "payments_insert_authenticated_users_only" ON public.payments;
DROP POLICY IF EXISTS "payments_update_admin_only" ON public.payments;
DROP POLICY IF EXISTS "payments_delete_admin_only" ON public.payments;

-- Create new secure policies that ONLY apply to authenticated users
-- SELECT Policy: Only authenticated users who own the filing or admins can view payments
CREATE POLICY "payments_select_authenticated_owner_or_admin" 
ON public.payments 
FOR SELECT 
TO authenticated
USING (
  -- User must be authenticated (auth.uid() is not null)
  auth.uid() IS NOT NULL
  AND (
    -- Either user is an admin
    is_admin()
    OR 
    -- Or user owns the associated filing
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

-- INSERT Policy: Only authenticated users can create payments for their own filings
CREATE POLICY "payments_insert_authenticated_users_only" 
ON public.payments 
FOR INSERT 
TO authenticated
WITH CHECK (
  -- User must be authenticated
  auth.uid() IS NOT NULL
  AND (
    -- Either user is an admin
    is_admin()
    OR 
    -- Or user owns the associated filing
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

-- UPDATE Policy: Only admins can update payments
CREATE POLICY "payments_update_admin_only" 
ON public.payments 
FOR UPDATE 
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND is_admin()
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND is_admin()
);

-- DELETE Policy: Only admins can delete payments
CREATE POLICY "payments_delete_admin_only" 
ON public.payments 
FOR DELETE 
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND is_admin()
);

-- Add security documentation
COMMENT ON TABLE public.payments IS 
'SECURITY CRITICAL: Contains sensitive financial transaction data including payment amounts, provider details, session IDs, and raw payment payloads. Access is strictly restricted to authenticated users who own the associated filing or system administrators. Anonymous access is completely blocked to prevent unauthorized access to financial information.';

-- Verify RLS is enabled (should already be enabled)
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Log the security fix
DO $$
BEGIN
  RAISE NOTICE 'CRITICAL SECURITY FIX APPLIED: Payments table policies now restrict access to authenticated users only. Anonymous access to sensitive financial data is completely blocked. Only authenticated filing owners and admins can access payment data.';
END $$;