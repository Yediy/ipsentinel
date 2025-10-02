-- Grant admin role to the provided user if they exist
INSERT INTO public.user_roles (user_id, role)
SELECT '98c2f065-a729-4c90-b4b7-ed8bd7f437e7'::uuid, 'admin'::app_role
WHERE EXISTS (
  SELECT 1 FROM auth.users WHERE id = '98c2f065-a729-4c90-b4b7-ed8bd7f437e7'
)
ON CONFLICT (user_id, role) DO NOTHING;