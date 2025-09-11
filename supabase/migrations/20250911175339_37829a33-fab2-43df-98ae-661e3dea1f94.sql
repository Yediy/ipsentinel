-- Fix critical security issue: Restrict access to AI prompt templates
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service role can manage prompt templates" ON public.ai_prompt_templates;

-- Create a new restrictive policy that only allows service role access
-- This prevents competitors from accessing our core business logic (AI prompts)
CREATE POLICY "Service role only can access prompt templates" 
ON public.ai_prompt_templates 
FOR ALL 
USING (false)  -- No direct user access
WITH CHECK (false);  -- No direct user inserts

-- Add a policy for authenticated admin users if needed in the future
-- (Currently commented out - uncomment when admin role system is implemented)
-- CREATE POLICY "Admin users can read prompt templates" 
-- ON public.ai_prompt_templates 
-- FOR SELECT 
-- USING (
--   EXISTS (
--     SELECT 1 FROM public.profiles 
--     WHERE profiles.user_id = auth.uid() 
--     AND profiles.role = 'admin'
--   )
-- );

-- Ensure the table still has RLS enabled
ALTER TABLE public.ai_prompt_templates FORCE ROW LEVEL SECURITY;