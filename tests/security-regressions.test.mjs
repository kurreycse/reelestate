import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("authentication errors are mapped and sessions are refresh-safe but tab-scoped", () => {
  const portal = read("app/Portal.tsx");
  const client = read("lib/supabase.ts");
  assert.doesNotMatch(portal, /setError\(error\.message\)/);
  assert.match(portal, /safeAuthError/);
  assert.match(client, /persistSession:\s*true/);
  assert.match(client, /window\.sessionStorage/);
  assert.doesNotMatch(client, /storage:\s*window\.localStorage/);
  assert.match(client, /-auth-token/);
  assert.match(portal, /Resend OTP in/);
  assert.match(portal, /updatedAttempts\.length >= OTP_SEND_LIMIT/);
  assert.match(portal, /OTP_SEND_LIMIT = 5/);
  assert.match(portal, /OTP_WINDOW_MS = 30 \* 60 \* 1000/);
  assert.match(portal, /request-phone-otp/);
  const otpFunction = read("supabase/functions/request-phone-otp/index.ts");
  assert.match(otpFunction, /p_limit:5,p_window_seconds:1800/);
  assert.match(otpFunction, /crypto\.subtle\.digest/);
  assert.doesNotMatch(portal, /mfaRequired/);
});

test("publisher-interest link is hidden for authenticated users", () => {
  const portal = read("app/Portal.tsx");
  assert.match(portal, /authReady\s*&&\s*!session\s*&&\s*\(/);
  assert.match(portal, /className="interest-compact"/);
});

test("logout clears privileged state and moderation rendering requires staff", () => {
  const portal = read("app/Portal.tsx");
  assert.match(portal, /async function logout\(\)/);
  assert.match(portal, /setView\("feed"\)/);
  assert.match(portal, /setQueue\(\[\]\)/);
  assert.match(portal, /view === "admin" && isStaff/);
  assert.match(portal, /view === "dashboard" && session/);
  assert.doesNotMatch(
    portal,
    /onClick=\{\(\) => supabase\.auth\.signOut\(\)\}/,
  );
});

test("posting fields adapt to the selected property type", () => {
  const portal = read("app/Portal.tsx");
  assert.match(portal, /setPropertyType\(e\.target\.value\)/);
  assert.match(portal, /propertyType === "Plot"/);
  assert.match(portal, /\["Plot", "Commercial"\]\.includes\(propertyType\)/);
});

test("property badges cannot cover or intercept the video play control", () => {
  const css = read("app/globals.css");
  assert.match(css, /\.tile-play\{z-index:4\}/);
  assert.match(
    css,
    /\.video-tag,\.reviewed-tag\{top:12px;bottom:auto;pointer-events:none\}/,
  );
  assert.match(
    css,
    /\.reviewed-video-label\{left:auto;right:16px;top:16px;bottom:auto;z-index:2;pointer-events:none\}/,
  );
});

test("profile registration derives identity from the verified auth user", () => {
  const portal = read("app/Portal.tsx");
  const migration = read(
    "supabase/migrations/202608230004_secure_profile_registration.sql",
  );
  assert.match(portal, /rpc\("complete_phone_registration"/);
  assert.doesNotMatch(portal, /from\("profiles"\)\.insert/);
  assert.match(migration, /from auth\.users/);
  assert.match(migration, /phone_confirmed_at is not null/);
  assert.match(
    migration,
    /grant execute on function public\.complete_phone_registration\(text,text,text\) to authenticated/,
  );
  assert.doesNotMatch(migration, /p_phone/);
});

test("new registration stores an optional validated Instagram handle", () => {
  const portal = read("app/Portal.tsx");
  const migration = read(
    "supabase/migrations/202608230008_profile_instagram_id.sql",
  );
  assert.match(portal, /p_instagram_id: instagram \|\| null/);
  assert.match(portal, /Instagram ID \(optional\)/);
  assert.match(migration, /add column if not exists instagram_id/);
  assert.match(
    migration,
    /regexp_replace\(trim\(coalesce\(p_instagram_id,''\)\),'\^@',''\)/,
  );
});

test("listing creation and dashboard reads use restricted interfaces", () => {
  const portal = read("app/Portal.tsx");
  const migration = read(
    "supabase/migrations/202608230001_security_remediation.sql",
  );
  const inactiveGuards = read(
    "supabase/migrations/202608230003_inactive_account_data_guards.sql",
  );
  assert.match(portal, /finalize-property-listing/);
  assert.doesNotMatch(portal, /from\("listings"\)\.insert/);
  assert.match(portal, /rpc\("get_my_listings"\)/);
  assert.match(
    migration,
    /revoke select on public\.listings from authenticated/,
  );
  assert.match(migration, /create_validated_listing/);
  assert.match(migration, /public\.is_active_user\(\)/);
  assert.match(inactiveGuards, /enquiries_owner_select/);
  assert.match(inactiveGuards, /can_read_property_video/);
});

test("rejected listings can be securely edited and resubmitted", () => {
  const portal = read("app/Portal.tsx");
  const finalizer = read(
    "supabase/functions/finalize-property-listing/index.ts",
  );
  const migration = read(
    "supabase/migrations/202608230009_rejected_listing_resubmission.sql",
  );
  assert.match(portal, /Edit &amp; resubmit/);
  assert.match(portal, /initial=\{editing \|\| undefined\}/);
  assert.match(portal, /upsert: Boolean\(initial\)/);
  assert.match(portal, /initial\?\.video_url \|\| ""/);
  assert.match(portal, /async function editRejected/);
  assert.match(portal, /createSignedUrl\(listing\.video_path, 1800\)/);
  assert.match(portal, /\(!initial && \(!video \|\| !poster\)\)/);
  assert.match(finalizer, /resubmit_validated_listing/);
  assert.match(finalizer, /existing\.status!=="rejected"/);
  assert.match(migration, /status='pending_review'/);
  assert.match(migration, /rejection_category=null,rejection_note=null/);
});

test("listing submission and moderation use audited notification templates", () => {
  const portal = read("app/Portal.tsx");
  const finalizer = read(
    "supabase/functions/finalize-property-listing/index.ts",
  );
  const moderator = read("supabase/functions/moderate-listing/index.ts");
  const notifications = read("supabase/functions/_shared/notifications.ts");
  assert.match(portal, /functions\.invoke\("moderate-listing"/);
  assert.match(finalizer, /notifyListing\(admin,"listing_submitted"/);
  assert.match(moderator, /"listing_approved":"listing_rejected"/);
  assert.match(notifications, /New property awaiting review/);
  assert.match(notifications, /Your property is approved/);
  assert.match(notifications, /Your property needs changes/);
  assert.match(notifications, /RESEND_API_KEY/);
  assert.match(notifications, /TWILIO_AUTH_TOKEN/);
});

test("public functions use atomic rate limiting and trusted proxy precedence", () => {
  for (const path of [
    "supabase/functions/record-engagement/index.ts",
    "supabase/functions/submit-property-enquiry/index.ts",
  ]) {
    const source = read(path);
    assert.match(source, /consume_rate_limit/);
    assert.match(source, /cf-connecting-ip/);
    assert.match(source, /\.at\(-1\)/);
    assert.doesNotMatch(source, /\.select\("id",\{count:"exact"/);
  }
});

test("PII retention and server-side media validation remain enabled", () => {
  const migration = read(
    "supabase/migrations/202608230001_security_remediation.sql",
  );
  const finalizer = read(
    "supabase/functions/finalize-property-listing/index.ts",
  );
  const portal = read("app/Portal.tsx");
  assert.match(migration, /180 days/);
  assert.match(migration, /cron\.schedule/);
  assert.match(finalizer, /video_codec_invalid/);
  assert.match(finalizer, /video_duration_invalid/);
  assert.doesNotMatch(finalizer, /duration>60/);
  const durationMigration = read(
    "supabase/migrations/202608230005_remove_video_duration_limit.sql",
  );
  assert.match(
    durationMigration,
    /drop constraint if exists listings_video_duration_seconds_check/,
  );
  assert.match(finalizer, /admin\.auth\.getUser\(token\)/);
  assert.match(finalizer, /response\.body\.getReader\(\)/);
  assert.match(finalizer, /total>maxSize/);
  assert.match(finalizer, /Math\.abs\(total-expectedSize\)>1024/);
  assert.match(portal, /submissionError\(error\)/);
});

test("dormant publisher-interest function is absent", () => {
  assert.equal(
    existsSync(
      new URL(
        "../supabase/functions/submit-publisher-interest/index.ts",
        import.meta.url,
      ),
    ),
    false,
  );
});
