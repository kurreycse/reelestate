# Supabase activation

1. Apply `migrations/202608210001_reelestate.sql` in the Supabase SQL Editor or CLI.
2. In Authentication > Providers > Phone, enable phone authentication and configure Twilio Verify using a newly rotated Auth Token.
3. Set OTP expiry to 600 seconds and rate limits appropriate to the launch country.
4. Create an administrator, complete their profile, then run the commented role-promotion statement at the end of the migration.
5. Confirm Storage contains the private `property-videos` and `property-posters` buckets.
6. Run negative tests: anonymous access to pending media, cross-user listing access, and poster calls to `moderate_listing` must all fail.

Security invariants:

- Browser authentication is memory-only; a reload requires a new mobile OTP and no refresh token is retained in local storage.
- Listing rows are created only by `finalize-property-listing`, which validates the JWT, active profile, private-object paths, size, JPEG signature, MP4/MOV container, H.264 video, AAC audio when present, and measured duration.
- Owners and staff read listings through scoped RPCs. Direct `authenticated` and `anon` table selection is revoked.
- Public Edge Functions consume atomic database rate-limit buckets using trusted proxy-header precedence.
- Enquiry and publisher-interest PII is purged after 180 days by the `reelestate-private-data-retention` cron job; owners can delete enquiries earlier.
- Keep `tests/security-regressions.test.mjs` in the default test command so these controls cannot be silently removed.

Never place the Twilio token or Supabase service-role key in browser environment variables.
