-- ============================================================
-- FIX: User signup error - add unique constraint on user_id
-- ============================================================

-- Step 1: Remove any duplicate profiles (keep newest by created_at)
DELETE FROM public.profiles a
USING public.profiles b
WHERE a.user_id = b.user_id
  AND a.created_at < b.created_at;

-- Step 2: Create unique index on user_id (required for ON CONFLICT)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_unique_idx ON public.profiles(user_id);

-- Step 3: Recreate handle_new_user function with proper security definer
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$;

-- Ensure proper permissions
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM public;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated, anon;

-- Step 4: Recreate the auth.users trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 5: Verify RLS is properly configured
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;