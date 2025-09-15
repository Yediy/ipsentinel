-- CRITICAL SECURITY FIX: Restrict payment data access to direct owners only
-- Payment information is highly sensitive and should never be accessible through email matching

-- Drop the vulnerable policy that allows email-based access to payments
DROP POLICY IF EXISTS "Users can view their payments" ON public.payments;

-- Create a highly restrictive policy that ONLY allows direct payment owners access
CREATE POLICY "Payment owners only can view payments" 
ON public.payments 
FOR SELECT 
TO authenticated
USING (
  -- ONLY allow access when the authenticated user directly owns the payment
  -- NO email-based access patterns that could expose financial data
  auth.uid() = user_id
);

-- Ensure anonymous users cannot access any payment data
CREATE POLICY "Block anonymous access to payments" 
ON public.payments 
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);

-- Also restrict UPDATE/DELETE to payment owners only
CREATE POLICY "Payment owners only can update payments" 
ON public.payments 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add security documentation
COMMENT ON TABLE public.payments IS 'CRITICAL SECURITY: Contains sensitive financial data. Access strictly limited to direct payment owners only - NO email-based access allowed';
COMMENT ON POLICY "Payment owners only can view payments" ON public.payments IS 'Restricts payment access to direct owners only - prevents exposure through email matching';

-- Log the security fix
DO $$
BEGIN
  RAISE NOTICE 'SECURITY FIX APPLIED: Payment table access restricted to direct owners only. Email-based access removed to prevent financial data exposure.';
END $$;