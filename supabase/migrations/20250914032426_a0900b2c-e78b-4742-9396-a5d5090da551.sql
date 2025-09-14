-- Fix security vulnerability in payments table RLS policy
-- The current policy allows any authenticated user to view payments for filings 
-- where user_id is NULL and contact_email is set, which exposes payment data

-- Drop the existing vulnerable policy
DROP POLICY IF EXISTS "Users can view their payments" ON public.payments;

-- Create a secure policy that only allows access when:
-- 1. The authenticated user owns the payment (user_id matches)
-- 2. OR the authenticated user owns the filing
-- 3. OR for anonymous filings, the authenticated user's email matches the filing's contact_email
CREATE POLICY "Users can view their payments" 
ON public.payments 
FOR SELECT 
TO authenticated
USING (
  -- User owns the payment directly
  (auth.uid() = user_id) 
  OR 
  -- User owns the filing, or for anonymous filings, user's email matches contact_email
  (EXISTS ( 
    SELECT 1
    FROM filings f
    WHERE f.id = payments.filing_id 
    AND (
      -- User owns the filing
      auth.uid() = f.user_id 
      OR 
      -- Anonymous filing where authenticated user's email matches contact_email
      (f.user_id IS NULL AND f.contact_email IS NOT NULL AND auth.email() = f.contact_email)
    )
  ))
);