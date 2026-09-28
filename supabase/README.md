# Supabase activation

1. Apply `migrations/202608210001_reelestate.sql` in the Supabase SQL Editor or CLI.
2. In Authentication > Providers > Phone, enable phone authentication and configure Twilio Verify using a newly rotated Auth Token.
3. Set OTP expiry to 600 seconds and rate limits appropriate to the launch country.
4. Create an administrator, complete their profile, then run the commented role-promotion statement at the end of the migration.
5. Confirm Storage contains the private `property-videos` and `property-posters` buckets.
6. Run negative tests: anonymous access to pending media, cross-user listing access, and poster calls to `moderate_listing` must all fail.

Security invariants:

- Browser authentication uses Facebook OAuth with PKCE and tab-scoped sessionStorage; auth tokens are not retained in localStorage.
- Listing rows are created only by `finalize-property-listing`, which validates the JWT, active profile, private-object paths, size, JPEG signature, MP4/MOV container, H.264 video, AAC audio when present, and records the measured duration. Video duration has no maximum; the 200 MB size limit remains.
- Video inspection uses a bounded streaming read, so validation does not depend on signed Storage URLs honoring HTTP range requests and does not buffer the whole video in Edge Function memory.
- Owners and staff read listings through scoped RPCs. Direct `authenticated` and `anon` table selection is revoked.
- Public Edge Functions consume atomic database rate-limit buckets using trusted proxy-header precedence.
- Enquiry and publisher-interest PII is purged after 180 days by the `reelestate-private-data-retention` cron job; owners can delete enquiries earlier.
- Keep `tests/security-regressions.test.mjs` in the default test command so these controls cannot be silently removed.

Never place the Twilio token or Supabase service-role key in browser environment variables.

## Facebook login

Facebook replaces the phone/password, OTP, and registration screens. Existing accounts and backend functions remain intact.

1. Apply `migrations/202609270001_facebook_registration.sql` to `realtyreels` (`uyizcipakauppzhmeqxu`).
2. Enable Facebook in Supabase Authentication > Providers using app ID `2639177136554797`. Store the app secret only in the provider settings, never in source or browser environment variables.
3. In Meta Facebook Login settings, allow the exact Valid OAuth Redirect URI `https://uyizcipakauppzhmeqxu.supabase.co/auth/v1/callback`.
4. Enable Facebook email permission and live access for users beyond app roles/testers.
5. Allow the app callback in Supabase URL Configuration: `http://localhost:3002/auth/facebook` for this preview and `https://reelestate-property-video.rabartkurrey.chatgpt.site/auth/facebook` for Sites. Add the exact callback for any other deployment domain.
6. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the build environment.

The callback exchanges the one-time code with PKCE, clears the URL, and creates a poster profile through a restricted RPC. Existing profiles and roles are preserved; disabled accounts are rejected.

Verify using a Facebook test account: successful login, cancellation, expired callback, refresh, logout, and first-time profile creation. See [Supabase Facebook setup](https://supabase.com/docs/guides/auth/social-login/auth-facebook).
