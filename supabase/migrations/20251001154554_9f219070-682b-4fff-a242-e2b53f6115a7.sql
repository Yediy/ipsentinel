-- Fix infinite recursion in user_roles RLS policies
-- The current "Only admins can manage roles" policy causes infinite recursion
-- because it checks is_admin() which queries user_roles, which triggers the policy again

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Only admins can manage roles" ON public.user_roles;

-- Create a simpler, non-recursive admin check policy
-- Service role and postgres role can always manage roles
CREATE POLICY "Service role can manage roles"
ON public.user_roles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- For authenticated users, allow admins to manage roles
-- But use a direct query without calling is_admin() to avoid recursion
CREATE POLICY "Direct admin check for role management"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'::app_role
    LIMIT 1
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'::app_role
    LIMIT 1
  )
);

-- Update the "Users can view their own roles" policy to be clearer
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());