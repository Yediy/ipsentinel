-- Fix security issues with profiles and AI prompt templates tables

-- Fix profiles table RLS - ensure users can only access their own data
DROP POLICY IF EXISTS "Anon cannot read profiles" ON public.profiles;

-- Create more restrictive profile policies
CREATE POLICY "Users can only read their own profile"
ON public.profiles
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Fix AI prompt templates - allow service role and authenticated users to read templates
DROP POLICY IF EXISTS "Service role only can access prompt templates" ON public.ai_prompt_templates;

CREATE POLICY "Service role can manage prompt templates" 
ON public.ai_prompt_templates 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can read prompt templates" 
ON public.ai_prompt_templates 
FOR SELECT 
TO authenticated
USING (is_active = true);

-- Ensure ai_prompt_templates has proper structure for security
-- Add user_id column if it doesn't exist for future user-specific templates
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_prompt_templates' AND column_name = 'created_by') THEN
        ALTER TABLE public.ai_prompt_templates ADD COLUMN created_by uuid REFERENCES auth.users(id);
    END IF;
END $$;