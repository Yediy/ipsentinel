# IPSentinel Ship Kit — Edge Functions & SQL
Generated: 2026-01-15T22:52:38.929763Z

Contents:
- supabase/functions/stripe-webhook/index.ts
- supabase/functions/deadline-reminder/index.ts
- supabase/sql/webhook_and_notify.sql
- supabase/sql/deadline_window.sql

Instructions:
1) Add these files into your repo in Lovable using the same paths.
2) In Supabase SQL Editor, run the two .sql files (order doesn't matter).
3) Configure each function's secrets:
   - STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
   - SUPABASE_URL, SUPABASE_SERVICE_ROLE
   - For deadline-reminder: POSTMARK_TOKEN, EMAIL_FROM
   - CORS_ORIGINS (comma-separated allowed origins)
4) Deploy functions:
   supabase functions deploy stripe-webhook --no-verify-jwt
   supabase functions deploy deadline-reminder
5) Stripe Dashboard → Webhooks: point to stripe-webhook URL and add events:
   checkout.session.completed, checkout.session.expired, payment_intent.payment_failed
6) Supabase Scheduled Triggers: schedule deadline-reminder daily.
