import { createClient } from "@supabase/supabase-js";

const origins = new Set([
  "https://reelestate.co.in",
  "https://www.reelestate.co.in",
  "https://reelestate-property-video.rabartkurrey.chatgpt.site",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:5173",
  "http://localhost:5174",
]);

const headers = (origin: string | null) => ({
  "access-control-allow-origin":
    origin && origins.has(origin) ? origin : "https://reelestate.co.in",
  "access-control-allow-headers":
    "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
  "cache-control": "no-store",
  "content-type": "application/json",
  vary: "Origin",
});

const reply = (body: unknown, status: number, origin: string | null) =>
  new Response(JSON.stringify(body), { status, headers: headers(origin) });

async function removeUserFiles(
  admin: ReturnType<typeof createClient>,
  bucket: string,
  userId: string,
) {
  const folders = [userId];
  const files: string[] = [];

  while (folders.length) {
    const folder = folders.pop()!;
    let offset = 0;

    while (true) {
      const { data, error } = await admin.storage.from(bucket).list(folder, {
        limit: 1000,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
      if (error) throw error;

      for (const entry of data) {
        const path = `${folder}/${entry.name}`;
        if (entry.id) files.push(path);
        else folders.push(path);
      }

      if (data.length < 1000) break;
      offset += data.length;
    }
  }

  for (let index = 0; index < files.length; index += 100) {
    const { error } = await admin.storage
      .from(bucket)
      .remove(files.slice(index, index + 100));
    if (error) throw error;
  }
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: headers(origin) });
  }
  if (request.method !== "POST") {
    return reply({ error: "method_not_allowed" }, 405, origin);
  }
  if (origin && !origins.has(origin)) {
    return reply({ error: "origin_not_allowed" }, 403, origin);
  }

  const authorization = request.headers.get("authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token) return reply({ error: "authentication_required" }, 401, origin);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    return reply({ error: "server_not_configured" }, 500, origin);
  }

  let payload: unknown;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 512) {
      return reply({ error: "invalid_confirmation" }, 400, origin);
    }
    payload = JSON.parse(raw) as unknown;
  } catch {
    return reply({ error: "invalid_confirmation" }, 400, origin);
  }
  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload) ||
    !("confirm" in payload) ||
    payload.confirm !== true
  ) {
    return reply({ error: "confirmation_required" }, 400, origin);
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  try {
    const {
      data: { user },
      error: userError,
    } = await admin.auth.getUser(token);
    if (userError || !user) {
      return reply({ error: "authentication_required" }, 401, origin);
    }

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("email, phone_e164")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) throw profileError;

    const { data: listings, error: listingsError } = await admin
      .from("listings")
      .select("id")
      .eq("owner_id", user.id);
    if (listingsError) throw listingsError;

    const { error: disableError } = await admin
      .from("profiles")
      .update({ is_active: false })
      .eq("id", user.id);
    if (disableError) throw disableError;

    const { error: enquiriesError } = await admin
      .from("property_enquiries")
      .delete()
      .eq("requester_id", user.id);
    if (enquiriesError) throw enquiriesError;

    const emails = new Set(
      [user.email, profile?.email]
        .filter((email): email is string => Boolean(email))
        .map((email) => email.toLowerCase()),
    );
    for (const email of emails) {
      const { error: feedbackError } = await admin
        .from("user_feedback")
        .delete()
        .eq("email", email);
      if (feedbackError) throw feedbackError;
      const { error: publisherInterestError } = await admin
        .from("publisher_interests")
        .delete()
        .eq("email", email);
      if (publisherInterestError) throw publisherInterestError;
    }

    const phoneNumbers = new Set(
      [user.phone, profile?.phone_e164].filter(
        (phone): phone is string => Boolean(phone),
      ),
    );
    for (const phone of phoneNumbers) {
      const { error: feedbackError } = await admin
        .from("user_feedback")
        .delete()
        .eq("mobile_e164", phone);
      if (feedbackError) throw feedbackError;
      const { error: publisherInterestError } = await admin
        .from("publisher_interests")
        .delete()
        .eq("phone_e164", phone);
      if (publisherInterestError) throw publisherInterestError;
    }

    await removeUserFiles(admin, "property-videos", user.id);
    await removeUserFiles(admin, "property-posters", user.id);

    const { error: actorAuditError } = await admin
      .from("audit_log")
      .delete()
      .eq("actor_id", user.id);
    if (actorAuditError) throw actorAuditError;

    const listingIds = (listings || []).map((listing) => listing.id);
    for (let index = 0; index < listingIds.length; index += 100) {
      const { error } = await admin
        .from("audit_log")
        .delete()
        .in("target_id", listingIds.slice(index, index + 100));
      if (error) throw error;
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;

    return reply({ deleted: true }, 200, origin);
  } catch (error) {
    console.error(
      "Account deletion failed",
      error instanceof Error ? error.message : error,
    );
    return reply({ error: "account_deletion_failed" }, 500, origin);
  }
});
