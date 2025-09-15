-- Fix final security issues: restrict AI prompt access and require auth for filings

-- 1. Fix AI prompt templates - restrict access to service role only
DROP POLICY IF EXISTS "Authenticated users can read prompt templates" ON public.ai_prompt_templates;

-- Only service role should access AI prompts to protect business logic
CREATE POLICY "Service role exclusive access to AI prompts" 
ON public.ai_prompt_templates 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- 2. Fix filings table - require authentication for creating filings
DROP POLICY IF EXISTS "Anyone can insert filings" ON public.filings;

-- Require authenticated users to create filings
CREATE POLICY "Authenticated users can create filings" 
ON public.filings 
FOR INSERT 
TO authenticated
WITH CHECK (
  -- User must be authenticated and either:
  -- 1. Setting their own user_id, OR 
  -- 2. Creating anonymous filing with contact_email
  (auth.uid() = user_id) 
  OR 
  (user_id IS NULL AND contact_email IS NOT NULL)
);

-- Add comments for documentation
COMMENT ON POLICY "Service role exclusive access to AI prompts" ON public.ai_prompt_templates 
IS 'Restricts AI prompt template access to service role only to protect proprietary business logic and prevent prompt exploitation';

COMMENT ON POLICY "Authenticated users can create filings" ON public.filings 
IS 'Requires authentication for filing creation to prevent spam and resource abuse while allowing both user-owned and anonymous filings with contact email';