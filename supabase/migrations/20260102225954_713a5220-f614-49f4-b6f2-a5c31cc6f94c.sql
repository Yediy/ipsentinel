-- Schedule daily deadline reminder cron job at 9 AM UTC
SELECT cron.schedule(
  'daily-deadline-reminder',
  '0 9 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://myygzczpldyovvqvbwbk.supabase.co/functions/v1/deadline-reminder',
        headers:=jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15eWd6Y3pwbGR5b3Z2cXZid2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNzk1ODYsImV4cCI6MjA3Mjk1NTU4Nn0.4kfbFkCl4rgCibyFF6mjviPXbW9-e2lEbh6jFyGiOwg'
        ),
        body:=jsonb_build_object('scheduled', true, 'timestamp', now())
    ) as request_id;
  $$
);