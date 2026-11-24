# Supabase activation

1. Apply every SQL file in `migrations/` in filename order (including migrations added after initial setup) in the Supabase SQL Editor or CLI. In particular, `202611210001_owner_listing_availability.sql` enables owners to take their published listings offline; the dashboard action will fail until this migration is applied to the connected project.
2. Create an administrator, complete their profile, then run the commented role-promotion statement at the end of the migration.
3. Confirm Storage contains the private `property-videos` and `property-posters` buckets.
4. Run negative tests: anonymous access to pending media, cross-user listing access, and poster calls to `moderate_listing` must all fail.

Security invariants:

- Browser authentication uses Supabase phone OTP with tab-scoped sessionStorage; auth tokens are not retained in localStorage.
- Listing rows are created only by `finalize-property-listing`, which validates the JWT, active profile, private-object paths, size, JPEG signature, MP4/MOV container, H.264 video, AAC audio when present, and records the measured duration. Video duration has no maximum; the 200 MB size limit remains.
- Video inspection uses a bounded streaming read, so validation does not depend on signed Storage URLs honoring HTTP range requests and does not buffer the whole video in Edge Function memory.
- Owners and staff read listings through scoped RPCs. Direct `authenticated` and `anon` table selection is revoked.
- Public Edge Functions consume atomic database rate-limit buckets using trusted proxy-header precedence.
- Enquiry and publisher-interest PII is purged after 180 days by the `reelestate-private-data-retention` cron job; owners can delete enquiries earlier.
- Account deletion is available at `/user-account-delete` and from My profile. Apply `migrations/202611140001_account_deletion.sql` and deploy `functions/delete-account` before enabling the request; it uses only server-side `SUPABASE_SERVICE_ROLE_KEY`, removes account-owned media and data, and anonymizes staff references.
- Keep `tests/security-regressions.test.mjs` in the default test command so these controls cannot be silently removed.

Never place the Supabase service-role key in browser environment variables.

## WhatsApp phone login

The login modal uses Supabase Auth to create and verify six-digit phone OTPs. The Send SMS Auth Hook forwards those codes to the Renflair WhatsApp endpoint shown in the supplied PHP reference. `WHATSAPP_OTP_API_KEY` and `SEND_SMS_HOOK_SECRET` are server secrets; neither belongs in browser variables or source code.

1. Enable phone authentication in Supabase Authentication > Providers > Phone. Keep automatic phone confirmation disabled so only a verified code creates a session.
2. Deploy the hook: `supabase functions deploy send-whatsapp-otp --no-verify-jwt`.
3. Add server secrets using the API key supplied for this integration and the signing secret created for the Supabase Send SMS Hook: `supabase secrets set --project-ref uyizcipakauppzhmeqxu WHATSAPP_OTP_API_KEY='<provider API key>' SEND_SMS_HOOK_SECRET='<hook signing secret>'`.
4. In Supabase Authentication > Hooks, enable Send SMS as an HTTP hook and set its URL to `https://uyizcipakauppzhmeqxu.supabase.co/functions/v1/send-whatsapp-otp`; use the same signing secret configured above.
5. Configure OTP expiry and rate limits for the launch country. The UI currently accepts Indian mobile numbers only.

The function validates Supabase's signed hook request, then forwards the Supabase-generated OTP to Renflair. Phone OTP login creates a new account when the phone number is not registered (`shouldCreateUser: true`); the account is usable only after the user verifies the code. Keep phone signup enabled in the live Supabase project's Auth settings. Verified phone data remains part of profiles and property contact flows.

See [Supabase Send SMS Hook](https://supabase.com/docs/guides/auth/auth-hooks/send-sms-hook) and [phone sign-in](https://supabase.com/docs/guides/auth/phone-login).
