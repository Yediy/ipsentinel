-- Add email column to profiles if not present
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text;

-- Create user_agreements table for terms acceptance tracking
CREATE TABLE IF NOT EXISTS public.user_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  version text NOT NULL DEFAULT 'v1',
  tos_accepted_at timestamptz,
  privacy_accepted_at timestamptz,
  disclaimer_accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, version)
);

ALTER TABLE public.user_agreements ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_agreements
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='ua_select_self_or_admin') THEN
    CREATE POLICY ua_select_self_or_admin ON public.user_agreements
      FOR SELECT USING (user_id = auth.uid() OR public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='ua_upsert_self') THEN
    CREATE POLICY ua_upsert_self ON public.user_agreements
      FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='ua_update_self') THEN
    CREATE POLICY ua_update_self ON public.user_agreements
      FOR UPDATE USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Create view to check if v1 agreements are accepted
CREATE OR REPLACE VIEW public.user_agreements_v1 AS
SELECT user_id,
       (tos_accepted_at IS NOT NULL) AND
       (privacy_accepted_at IS NOT NULL) AND
       (disclaimer_accepted_at IS NOT NULL) AS accepted
FROM public.user_agreements
WHERE version = 'v1';

GRANT SELECT ON public.user_agreements_v1 TO anon, authenticated;