-- Update the cleanup cron job to use the service role key from Vault instead of the public anon key.
-- First unschedule the old job, then recreate it using current_setting to pull the service_role key at runtime.

SELECT cron.unschedule('cleanup-expired-data-daily');

SELECT cron.schedule(
  'cleanup-expired-data-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://myygzczpldyovvqvbwbk.supabase.co/functions/v1/cleanup-expired-data',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);