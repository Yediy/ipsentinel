# Security Guidelines

## Recent Security Updates (2025-10-03)

✅ **Critical security fixes applied** - See [SECURITY_FIXES_APPLIED.md](./SECURITY_FIXES_APPLIED.md) for details.

**Key improvements**:
- Removed authentication bypass vulnerabilities
- Secured role management with dedicated endpoint
- Protected audit logs from tampering
- Strengthened storage bucket access controls
- Eliminated privilege escalation risks

## Environment Variables

**CRITICAL**: Never commit `.env` files to version control.

### Required Environment Variables

All sensitive keys should be stored in:
- Lovable Project Settings → Environment Variables
- Supabase Dashboard → Settings → Edge Functions (for edge function secrets)

### Frontend (Lovable)
```
VITE_SUPABASE_URL=https://myygzczpldyovvqvbwbk.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

### Edge Functions (Supabase Dashboard)
```
POSTMARK_API_KEY=<your-postmark-key>
STRIPE_SECRET_KEY=<your-stripe-key>
OPENAI_API_KEY=<your-openai-key>
LOVABLE_DOC_WEBHOOK_SECRET=<your-webhook-secret>
SUPABASE_URL=https://myygzczpldyovvqvbwbk.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

## Security Checklist

- [x] .env in .gitignore
- [x] RLS enabled on all user tables
- [x] Email verification required
- [x] Legal consent gate
- [x] Private storage buckets with MIME type restrictions
- [x] CORS validation helper (requires CORS_ORIGINS configuration)
- [x] Security headers (CSP, HSTS, etc.)
- [x] SSRF protection on asset fetches
- [x] Input validation with Zod schemas
- [x] Role management via secure edge function
- [x] Audit log protected from tampering
- [x] No authentication bypass vulnerabilities
- [ ] Password policies configured (manual - see SECURITY_FIXES_APPLIED.md)
- [ ] CORS_ORIGINS environment variable set (manual)

## If .env Was Accidentally Committed

Run: `.github/scripts/remove-env-from-history.sh`

Then notify team members to re-clone the repository.
