-- Tighten RLS on profiles to prevent any public/anon reads
-- 1) Drop broad PUBLIC policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- 2) Recreate policies scoped explicitly to authenticated role
CREATE POLICY "Users can view only their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert only their own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update only their own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3) Explicitly block anonymous reads (defense-in-depth)
CREATE POLICY "Anon cannot read profiles" 
ON public.profiles 
FOR SELECT 
TO anon
USING (false);
