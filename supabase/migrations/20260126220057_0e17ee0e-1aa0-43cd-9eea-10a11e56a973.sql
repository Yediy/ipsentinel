-- Insert feature flags for international filing endpoints
INSERT INTO public.settings (key, value)
VALUES 
  ('feature_flags', '{"epo_enabled": false, "pct_enabled": false, "cnipa_enabled": false, "madrid_enabled": false}'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- Insert PostHog configuration placeholder
INSERT INTO public.settings (key, value)
VALUES 
  ('analytics_config', '{"posthog_enabled": true}'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();