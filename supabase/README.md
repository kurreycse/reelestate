# Supabase activation

1. Apply `migrations/202608210001_reelestate.sql` in the Supabase SQL Editor or CLI.
2. In Authentication > Providers > Phone, enable phone authentication and configure Twilio Verify using a newly rotated Auth Token.
3. Set OTP expiry to 600 seconds and rate limits appropriate to the launch country.
4. Create an administrator, complete their profile, then run the commented role-promotion statement at the end of the migration.
5. Confirm Storage contains the private `property-videos` and `property-posters` buckets.
6. Run negative tests: anonymous access to pending media, cross-user listing access, and poster calls to `moderate_listing` must all fail.

Never place the Twilio token or Supabase service-role key in browser environment variables.
