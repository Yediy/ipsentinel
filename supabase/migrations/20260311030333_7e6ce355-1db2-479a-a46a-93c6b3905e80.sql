-- Unschedule old cron job that uses anon key
SELECT cron.unschedule('daily-deadline-reminder');

-- Reschedule with service role key for proper authentication
SELECT cron.schedule(
  'daily-deadline-reminder',
  '0 9 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://myygzczpldyovvqvbwbk.supabase.co/functions/v1/deadline-reminder',
        headers:=jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('supabase.service_role_key')
        ),
        body:=jsonb_build_object('scheduled', true, 'timestamp', now())
    ) as request_id;
  $$
);