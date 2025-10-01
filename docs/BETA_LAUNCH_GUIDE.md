# IPGenie Beta Launch Guide

## ✅ Completed Requirements

### 1. Auth & Onboarding
- ✅ Email/password sign-up with email verification enforced
- ✅ `profiles` row auto-created on first sign-in via trigger
- ✅ Terms/Privacy consent gating implemented (`LegalConsentGate` component)
- ✅ RLS policies on all tables
- 🔲 Stripe customer creation (optional, for future billing)

### 2. Data Model & RLS
All tables have proper RLS policies:
- ✅ `profiles` - Users can only view/edit their own profile
- ✅ `filings` - Users can only access their own filings
- ✅ `documents` - Access controlled via filing ownership
- ✅ `notifications` - Users see only their notifications
- ✅ `upcoming_deadlines` - Filtered by user_id
- ✅ `filing_queue` - Users see only their jobs
- ✅ Private storage bucket `filings` configured

### 3. Core Flows
- ✅ Filing Wizard (patent + trademark + copyright)
- ✅ Patent draft generation with AI
- ✅ Drawings generation system
- ✅ Translation endpoints (Chinese support)
- ✅ Prior-art search (EPO OPS) - `/prior-art`
- ✅ US TM status (TSDR) - `/tm-status`
- ✅ Export functionality available

### 4. Email & Webhooks
- ✅ Postmark integration (`POSTMARK_API_KEY` configured)
- ✅ Welcome email edge function (`welcome-email`)
- ✅ Deadline reminder email edge function (`deadline-reminder`)
- ✅ General email sender edge function (`email-sender`)
- ✅ Stripe webhook handler (`stripe-webhook`)

### 5. Security & Ops
- ✅ CORS configuration via `security-headers.ts`
- ✅ RLS enabled on all user tables
- ✅ Input validation using Zod schemas
- ✅ SSRF guard for external API calls
- ✅ Rate limiting capabilities
- ✅ Secure error handling
- ✅ Webhook signature verification

### 6. Testing
- ✅ Playwright smoke tests configured (`tests/smoke.spec.ts`)
- ✅ GitHub Actions workflow (`.github/workflows/smoke-tests.yml`)
- ✅ Test coverage for critical flows

## 🚀 Deployment Steps

### Pre-Launch Checklist

1. **Environment Variables** (Supabase Edge Functions)
   ```bash
   # Already configured:
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY
   - SUPABASE_ANON_KEY
   - POSTMARK_API_KEY
   - LOVABLE_DOC_WEBHOOK_SECRET
   - OPENAI_API_KEY
   - STRIPE_SECRET_KEY
   
   # Optional (for live integrations):
   - OPS_KEY
   - OPS_SECRET
   - TSDR_API_KEY
   ```

2. **Database Configuration**
   - ✅ All tables created with proper schema
   - ✅ RLS policies enabled
   - ✅ Triggers configured (profile creation, deadline computation)
   - ✅ Storage buckets created (`filings`, `copyright-works`)

3. **Edge Functions Deployed**
   ```
   - email-sender
   - welcome-email
   - deadline-reminder
   - generate-patent
   - drawing-generator
   - translation-api
   - patent-ops-search
   - tess-search
   - tm-tsdr
   - stripe-webhook
   ```

4. **Frontend Routes**
   - ✅ `/auth` - Sign in/Sign up
   - ✅ `/please-verify` - Email verification prompt
   - ✅ `/dashboard` - Main user dashboard (protected + consent-gated)
   - ✅ `/filings` - Filing management (protected + consent-gated)
   - ✅ `/filing/wizard` - Filing creation wizard (protected + consent-gated)
   - ✅ `/prior-art` - Prior art search
   - ✅ `/tm-status` - Trademark status lookup

### Testing Before Launch

Run smoke tests:
```bash
npm install
npx playwright install --with-deps
APP_URL=https://your-app.lovable.app npx playwright test
```

### Manual Testing Checklist

1. **Sign Up Flow**
   - [ ] Create new account with email/password
   - [ ] Receive verification email
   - [ ] Click verification link
   - [ ] Redirected to legal consent page
   - [ ] Accept terms and privacy policy
   - [ ] Land on dashboard

2. **Filing Creation**
   - [ ] Create a patent filing
   - [ ] Generate specification with AI
   - [ ] Generate drawings
   - [ ] Create a trademark filing
   - [ ] Create a copyright filing
   - [ ] Verify documents are stored securely

3. **Search & Status**
   - [ ] Search prior art on EPO
   - [ ] Look up US trademark status
   - [ ] Verify results display correctly

4. **Notifications & Email**
   - [ ] Welcome email received on sign-up
   - [ ] Deadline notifications appear in dashboard
   - [ ] Email reminders work (test with upcoming deadline)

5. **Security**
   - [ ] Unauthenticated users redirected to /auth
   - [ ] Unverified users redirected to /please-verify
   - [ ] Users without consent see legal gate
   - [ ] Users cannot access other users' filings
   - [ ] Document URLs are signed and expire

## 📋 Post-Launch Monitoring

### Metrics to Track
1. User sign-ups and verification rate
2. Filing creation rate by type (patent/trademark/copyright)
3. API usage (OPS, TSDR, OpenAI)
4. Error rates in edge functions
5. Email delivery success rates
6. Storage usage

### Log Locations
- **Supabase Edge Functions**: Supabase Dashboard > Functions > Logs
- **Database Errors**: Supabase Dashboard > Logs > Postgres
- **Auth Events**: Supabase Dashboard > Auth > Logs
- **Storage Events**: Supabase Dashboard > Storage > Logs

### Known Limitations (Beta)
1. Live filing submission to patent offices requires OAuth credentials
2. Translation quality depends on OpenAI API
3. ClamAV antivirus scanning not yet implemented
4. Rate limiting is basic (needs Redis for production scale)
5. Health endpoint not yet implemented

## 🔧 Troubleshooting

### User Can't Sign Up
- Check Supabase auth settings (email verification enabled?)
- Verify POSTMARK_API_KEY is set
- Check email spam folder

### User Sees "Permission Denied" on Data
- Verify RLS policies are correct
- Check user authentication status
- Ensure user_id is properly set on records

### Edge Function Fails
- Check function logs in Supabase Dashboard
- Verify all required environment variables are set
- Check for CORS issues in browser console

### Email Not Received
- Verify POSTMARK_API_KEY is valid
- Check Postmark dashboard for delivery status
- Verify sender domain is authenticated in Postmark

## 📞 Support Resources

- **Supabase Dashboard**: https://supabase.com/dashboard/project/myygzczpldyovvqvbwbk
- **Postmark Dashboard**: https://account.postmarkapp.com
- **Edge Function Logs**: [Supabase Functions](https://supabase.com/dashboard/project/myygzczpldyovvqvbwbk/functions)
- **GitHub Actions**: Check workflow runs for smoke test results

## 🎯 Next Steps After Beta

1. **Production Hardening**
   - Implement full ClamAV scanning
   - Add Redis-based rate limiting
   - Set up comprehensive error tracking (Sentry)
   - Add health check endpoints
   - Implement automated backups

2. **Feature Additions**
   - Live filing submission via OAuth
   - PDF annotation tools
   - Collaborative editing
   - Advanced deadline management
   - Mobile app (Capacitor)

3. **Scaling Considerations**
   - CDN for static assets
   - Database connection pooling
   - Caching layer (Redis)
   - Load balancing for edge functions
   - Background job processing

---

**Last Updated**: 2025-01-01
**Version**: Beta 1.0
**Status**: ✅ Ready for Beta Launch
