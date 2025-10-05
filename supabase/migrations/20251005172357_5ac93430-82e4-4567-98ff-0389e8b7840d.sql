-- Clean up user_roles table - keep only the correct admin user
DELETE FROM public.user_roles 
WHERE role = 'admin' 
  AND user_id != '98c2f065-a729-4c90-b4b7-ed8bd7f437e7';

-- Ensure the correct admin user exists
INSERT INTO public.user_roles (user_id, role)
VALUES ('98c2f065-a729-4c90-b4b7-ed8bd7f437e7', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;