import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("authentication errors are mapped and sessions are refresh-safe but tab-scoped", () => {
  const portal = read("app/Portal.tsx");
  const client = read("lib/supabase.ts");
  assert.doesNotMatch(portal, /setError\(error\.message\)/);
  assert.match(portal, /safeAuthError/);
  assert.match(client, /persistSession:\s*true/);
  assert.match(client, /window\.sessionStorage/);
  assert.doesNotMatch(client, /storage:\s*window\.localStorage/);
  assert.match(client, /-auth-token/);
});

test("publisher-interest link is hidden for authenticated users", () => {
  const portal = read("app/Portal.tsx");
  assert.match(portal, /authReady&&!session&&<a className="interest-compact"/);
});

test("profile registration derives identity from the verified auth user", () => {
  const portal = read("app/Portal.tsx");
  const migration = read("supabase/migrations/202608230004_secure_profile_registration.sql");
  assert.match(portal, /rpc\("complete_phone_registration"/);
  assert.doesNotMatch(portal, /from\("profiles"\)\.insert/);
  assert.match(migration, /from auth\.users/);
  assert.match(migration, /phone_confirmed_at is not null/);
  assert.match(migration, /grant execute on function public\.complete_phone_registration\(text,text,text\) to authenticated/);
  assert.doesNotMatch(migration, /p_phone/);
});

test("listing creation and dashboard reads use restricted interfaces", () => {
  const portal = read("app/Portal.tsx");
  const migration = read("supabase/migrations/202608230001_security_remediation.sql");
  const inactiveGuards = read("supabase/migrations/202608230003_inactive_account_data_guards.sql");
  assert.match(portal, /finalize-property-listing/);
  assert.doesNotMatch(portal, /from\("listings"\)\.insert/);
  assert.match(portal, /rpc\("get_my_listings"\)/);
  assert.match(migration, /revoke select on public\.listings from authenticated/);
  assert.match(migration, /create_validated_listing/);
  assert.match(migration, /public\.is_active_user\(\)/);
  assert.match(inactiveGuards, /enquiries_owner_select/);
  assert.match(inactiveGuards, /can_read_property_video/);
});

test("public functions use atomic rate limiting and trusted proxy precedence", () => {
  for (const path of ["supabase/functions/record-engagement/index.ts", "supabase/functions/submit-property-enquiry/index.ts"]) {
    const source = read(path);
    assert.match(source, /consume_rate_limit/);
    assert.match(source, /cf-connecting-ip/);
    assert.match(source, /\.at\(-1\)/);
    assert.doesNotMatch(source, /\.select\("id",\{count:"exact"/);
  }
});

test("PII retention and server-side media validation remain enabled", () => {
  const migration = read("supabase/migrations/202608230001_security_remediation.sql");
  const finalizer = read("supabase/functions/finalize-property-listing/index.ts");
  const portal = read("app/Portal.tsx");
  assert.match(migration, /180 days/);
  assert.match(migration, /cron\.schedule/);
  assert.match(finalizer, /video_codec_invalid/);
  assert.match(finalizer, /video_duration_invalid/);
  assert.match(finalizer, /admin\.auth\.getUser\(token\)/);
  assert.match(finalizer, /content-range/);
  assert.match(portal, /submissionError\(error\)/);
});

test("dormant publisher-interest function is absent", () => {
  assert.equal(existsSync(new URL("../supabase/functions/submit-publisher-interest/index.ts", import.meta.url)), false);
});
