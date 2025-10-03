-- Add user as administrator
INSERT INTO public.admin_users (user_id)
VALUES ('98c2f065-a729-4c90-b4b7-ed8bd7f437e7')
ON CONFLICT (user_id) DO NOTHING;