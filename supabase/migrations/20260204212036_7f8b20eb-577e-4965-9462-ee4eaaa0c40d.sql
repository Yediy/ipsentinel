-- Create cron job to run cleanup-expired-data daily at 3 AM UTC
SELECT cron.schedule(
  'cleanup-expired-data-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://myygzczpldyovvqvbwbk.supabase.co/functions/v1/cleanup-expired-data',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15eWd6Y3pwbGR5b3Z2cXZid2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNzk1ODYsImV4cCI6MjA3Mjk1NTU4Nn0.4kfbFkCl4rgCibyFF6mjviPXbW9-e2lEbh6jFyGiOwg"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);