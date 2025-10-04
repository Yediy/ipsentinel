-- Add defense-in-depth validation for profiles table
-- This ensures user_id always matches the authenticated user on INSERT

-- Create validation function
CREATE OR REPLACE FUNCTION public.validate_profile_user_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure the user_id being inserted matches the authenticated user
  IF NEW.user_id != auth.uid() THEN
    RAISE EXCEPTION 'Cannot create profile for another user. user_id must match authenticated user.'
      USING HINT = 'You can only create profiles for yourself',
            ERRCODE = '42501'; -- insufficient_privilege
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to validate user_id on INSERT
DROP TRIGGER IF EXISTS validate_profile_user_id_trigger ON public.profiles;

CREATE TRIGGER validate_profile_user_id_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_profile_user_id();

-- Add comment for documentation
COMMENT ON FUNCTION public.validate_profile_user_id() IS 
  'Defense-in-depth: Validates that profile inserts have user_id matching auth.uid(). Works alongside RLS policies to prevent unauthorized profile creation.';
