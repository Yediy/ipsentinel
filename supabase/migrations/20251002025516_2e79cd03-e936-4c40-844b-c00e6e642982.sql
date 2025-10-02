-- Fix profiles UPDATE policy to only apply to authenticated users
-- Current issue: policy applies to 'public' role which includes anonymous users

DROP POLICY IF EXISTS "profiles_update_self_basic" ON public.profiles;

CREATE POLICY "profiles_update_self_basic" 
ON public.profiles 
FOR UPDATE 
TO authenticated  -- Changed from 'public' to 'authenticated'
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid() 
  AND (
    -- Role hasn't changed, OR user is admin
    NOT (role IS DISTINCT FROM (SELECT p.role FROM public.profiles p WHERE p.user_id = auth.uid()))
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);