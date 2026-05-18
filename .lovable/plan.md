## Launch-blocker audit — IPGenie V1

Below is what I found that would realistically stop you from charging real customers on launch day. Grouped by severity. Nothing here is a UI tweak — these are gaps in the money/legal/operational path.

---

### 1. Payments are NOT actually live

The Stripe path works in test mode but several things must be configured before you can take a real dollar:

- **`STRIPE_WEBHOOK_SECRET` is referenced in `stripe-webhook/index.ts` but is not in your project secrets list.** Without it, every real webhook will fail signature verification → users will pay but never get their draft. This is the single biggest launch blocker.
- **Stripe key is in live mode?** Currently `STRIPE_SECRET_KEY` exists, but there is no indication it's a `sk_live_…` key. Needs explicit switch + endpoint registered in Stripe Dashboard pointing at `…/functions/v1/stripe-webhook`.
- **Two webhook handlers exist** (`stripe-webhook` and `enhanced-stripe-webhook`). Only one should be registered in Stripe; the other should be deleted to avoid double-processing.
- **Two checkout creators exist** (`create-payment` legacy + `provisional-payment` V1). The legacy one should be removed or clearly fenced off.
- **No refund / dispute handler.** `charge.refunded` and `charge.dispute.created` are not handled, so refunded customers will keep their `paid` filing and downloads.
- **Tax not handled.** Stripe Checkout is created without `automatic_tax` or any tax collection. For US digital goods this is a growing exposure.

### 2. Email is not actually wired

- `email-sender` function is called by `generate-provisional`, but `POSTMARK_API_KEY` + `FROM_EMAIL` setup hasn't been verified end-to-end (no sender domain in secrets, no DKIM/SPF guidance in the repo). Customers will pay and get no "draft ready" email.
- No transactional email for: receipt, failed generation, 24h-before-deletion warning, account verification reminder.

### 3. Retention / deletion safety

- `cleanup-expired-data` cron exists, but there is **no "24h before delete" warning email**, which you advertise as a privacy feature. Users will lose paid artifacts silently.
- Deletion path wipes `answers_json` but **does not delete the `filing` row or the generated `filings.claims/abstract/...` columns**, which contain the same IP. Privacy promise is half-kept.

### 4. Legal & compliance gaps for a paid IP product

- **Refund policy page exists, but no in-checkout disclosure** that this is an AI-generated draft, not legal advice, and not filed with USPTO. Required to avoid UDAP / FTC exposure.
- **No "not a law firm" disclaimer gate** before checkout (the LegalConsentGate covers ToS, not the AI-output disclaimer).
- **No record of consent version** tied to each `intake` / `payment` row — needed if a user disputes.
- The DPA and Privacy pages exist but the 72-hour retention promise isn't echoed on the checkout screen.

### 5. Generation reliability

- `generate-provisional` runs **synchronously inside the webhook fetch** with ~7 sequential OpenAI calls + PDF + DOCX + checklist. On a cold start this will exceed Stripe's 10s webhook timeout window and likely time out the function too. Stripe will retry → duplicate generations / duplicate documents.
  - Needs: webhook returns 200 immediately, generation runs via `generation_jobs` queue + a separate worker (cron or pg_net trigger). The `generation_jobs` table is already there but unused as a real queue.
- **No retry/backoff** on OpenAI 429/500. One blip = a `failed` intake the user has to manually retry.
- **No max-attempts cap** on `generation_jobs.attempts` — runaway retries possible.

### 6. Observability before real users

- Sentry DSN is set but **no alerting rules** documented (payment failures, generation failures, webhook 4xx).
- No dashboard/log query for "paid but not ready in >30 min" — this is the #1 support ticket you'll get.

### 7. Admin operations

- No admin UI to **manually re-trigger generation** for a stuck paid intake, or **issue a refund + delete**. With paying customers you need this on day 1.
- No way for an admin to view a user's intake to help debug ("I don't see my download").

### 8. Smaller but visible

- Pricing in `PaymentFlow.tsx` hard-codes $49/$129/$199 but `create-payment` legacy uses the same numbers — confirm these match what's set in Stripe products and what you publicly advertise.
- No analytics on the conversion funnel (wizard start → score pass → checkout → paid → downloaded). PostHog file exists but events aren't instrumented on the V1 flow.
- No published status page or "we'll email you within X hours" expectation set on the post-payment screen.
- Browser SEO/meta: title and description on landing not optimized for "provisional patent" keywords.

---

### Suggested launch-blocker order

```text
Must-fix before taking real money
  1. Add STRIPE_WEBHOOK_SECRET + register live webhook
  2. Move generation off the webhook hot path → real queue worker
  3. Verify Postmark sender + send receipt + "draft ready" email
  4. AI-draft disclaimer checkbox on checkout, stored on payment row
  5. Delete the legacy create-payment + enhanced-stripe-webhook duplicates
  6. Handle charge.refunded → revoke documents + intake

Should-fix in first week
  7. 24h-before-deletion warning email
  8. Fully wipe filing IP fields on delete
  9. Admin "re-run generation" + "refund & purge" actions
 10. Conversion + failure analytics
 11. OpenAI retry/backoff + attempts cap

Nice-to-have
 12. Stripe automatic_tax
 13. Status page + funnel dashboard
 14. SEO meta on landing
```

If you want, I can implement these in order — say "start with 1–6" and I'll execute that batch.
