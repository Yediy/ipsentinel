# IPGenie Deployment Guide

## Beta Launch Checklist

### 1. Database Migration ✅

Migration applied:
- ✅ Added `tos_accepted_at` to profiles table
- ✅ Created profile auto-creation trigger
- ✅ Set up storage RLS policies for `docs` bucket

### 2. Environment Variables

#### Lovable Project Settings
```
VITE_SUPABASE_URL=https://myygzczpldyovvqvbwbk.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<from Supabase>
```

#### Supabase Edge Functions (Dashboard → Settings → Edge Functions)
```
POSTMARK_API_KEY=<your-key>
FROM_EMAIL=noreply@yourdomain.com
SUPABASE_URL=https://myygzczpldyovvqvbwbk.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<from Supabase>
SUPABASE_ANON_KEY=<from Supabase>
OPENAI_API_KEY=<your-key>
STRIPE_SECRET_KEY=<your-key>
LOVABLE_DOC_WEBHOOK_SECRET=<your-secret>
CORS_ORIGINS=https://your-app.lovable.dev
```

### 3. Email Setup (Postmark)

1. Create account at https://postmarkapp.com
2. Verify your sending domain
3. Get Server API Token
4. Add to Supabase Edge Functions env as `POSTMARK_API_KEY`

### 4. Cron Jobs Setup

Run in Supabase SQL Editor:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Daily deadline reminders at 9 AM UTC
SELECT cron.schedule(
  'deadline-reminders',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://myygzczpldyovvqvbwbk.supabase.co/functions/v1/deadline-reminder',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
  $$
);

-- Daily trademark status sync at 2 AM UTC
SELECT cron.schedule(
  'status-sync',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://myygzczpldyovvqvbwbk.supabase.co/functions/v1/status-sync',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
  $$
);
```

### 5. Edge Functions Deployed

✅ Already deployed:
- `email-sender` - Transactional emails
- `deadline-reminder` - Automated reminders
- `welcome-email` - User onboarding
- `status-sync` - Trademark status updates

### 6. Security Verification

- ✅ Email verification required
- ✅ Legal consent gate active
- ✅ RLS on all user tables
- ✅ Private storage with RLS
- ✅ CORS configured
- ✅ Input validation with Zod

### 7. Smoke Test Checklist

Test this flow:
1. [ ] Sign up with new email
2. [ ] Receive and click verification email
3. [ ] Accept ToS & Privacy Policy
4. [ ] Create a patent filing
5. [ ] Generate PDF and drawings
6. [ ] Export ZIP package
7. [ ] Check notifications work
8. [ ] Verify deadline appears in dashboard

### 8. Monitoring Setup

**Supabase Dashboard:**
- Functions → Logs (check for errors)
- Auth → Users (verify signups)
- Storage → Buckets (verify uploads)

**Postmark:**
- Activity → Email delivery stats
- Set up bounce/spam notifications

**GitHub Actions:**
- Verify workflows run successfully
- Check for security scan alerts

### 9. Production Readiness

Before going live:
- [ ] Test full user flow end-to-end
- [ ] Verify all emails deliver
- [ ] Check RLS policies work correctly
- [ ] Test file uploads to storage
- [ ] Verify cron jobs execute
- [ ] Set up error monitoring
- [ ] Configure uptime monitoring
- [ ] Review and rotate any exposed secrets

### 10. Launch Day

1. Announce beta availability
2. Monitor error logs closely
3. Watch email delivery rates
4. Track user signups
5. Respond quickly to issues
6. Gather feedback

## Support Resources

- Supabase Docs: https://supabase.com/docs
- Postmark Docs: https://postmarkapp.com/developer
- Edge Function Logs: Supabase Dashboard → Functions → Logs
- Database Logs: Supabase Dashboard → Database → Logs

## Troubleshooting

**Users not receiving emails:**
- Check Postmark API key is set
- Verify FROM_EMAIL domain is verified
- Check spam folders
- Review Postmark activity logs

**Authentication issues:**
- Verify email confirmation is enabled in Supabase Auth settings
- Check redirect URLs are whitelisted
- Review auth logs in Supabase

**File upload failures:**
- Verify storage RLS policies
- Check file size limits
- Ensure bucket exists and is private

**Deadline reminders not sent:**
- Verify cron job is scheduled
- Check edge function logs
- Ensure POSTMARK_API_KEY is set
