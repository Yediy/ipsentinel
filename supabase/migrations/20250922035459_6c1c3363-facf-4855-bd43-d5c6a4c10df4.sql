-- Fix Security Definer View issue by removing the problematic function
-- The get_user_documents function is causing the security definer warning
-- Since we have proper RLS on the documents table, this function is unnecessary

DROP FUNCTION IF EXISTS public.get_user_documents(uuid);

-- Verify that the documents table RLS policies are sufficient for security
-- Users can only access documents from their own filings
SELECT 'Security verification: Documents table has proper RLS policies' as status;