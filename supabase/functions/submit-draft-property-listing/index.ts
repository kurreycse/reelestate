import { createClient } from "@supabase/supabase-js";
import { notifyListing } from "../_shared/notifications.ts";

const allowedOrigins = new Set([
  "https://reelestate.co.in",
  "https://www.reelestate.co.in",
  "http://localhost:3000",
  "http://localhost:3002",
  "http://localhost:3003",
  "http://localhost:5173",
  "http://localhost:5174",
]);
const cors = (origin: string | null) => ({
  "access-control-allow-origin": origin && allowedOrigins.has(origin)
    ? origin
    : "https://reelestate.co.in",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
  vary: "Origin",
});
const json = (body: unknown, status: number, origin: string | null) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(origin), "content-type": "application/json", "cache-control": "no-store" },
  });

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin);
  if (origin && !allowedOrigins.has(origin)) return json({ error: "origin_not_allowed" }, 403, origin);

  try {
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "authentication_required" }, 401, origin);
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return json({ error: "server_not_configured" }, 500, origin);
    const admin = createClient(url, key, { auth: { persistSession: false } });
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return json({ error: "authentication_required" }, 401, origin);
    const { data: profile } = await admin.from("profiles").select("is_active").eq("id", user.id).maybeSingle();
    if (!profile?.is_active) return json({ error: "account_inactive" }, 403, origin);

    const body = await request.json().catch(() => ({})) as { listing_id?: string };
    const listingId = String(body.listing_id || "");
    const { data: listing } = await admin.from("listings")
      .select("id,owner_id,status,title,city,locality")
      .eq("id", listingId).eq("owner_id", user.id).eq("status", "draft").maybeSingle();
    if (!listing) return json({ error: "draft_not_found" }, 404, origin);

    const { data: updated, error: updateError } = await admin.from("listings")
      .update({ status: "pending_review", updated_at: new Date().toISOString() })
      .eq("id", listing.id).eq("owner_id", user.id).eq("status", "draft")
      .select("id").maybeSingle();
    if (updateError) throw updateError;
    if (!updated) return json({ error: "draft_not_found" }, 409, origin);

    await notifyListing(admin, "listing_submitted", {
      id: listing.id,
      owner_id: user.id,
      title: listing.title,
      city: listing.city,
      locality: listing.locality,
    });
    return json({ accepted: true, listing_id: listing.id, status: "pending_review" }, 200, origin);
  } catch (error) {
    console.error("Draft listing submission failed", error instanceof Error ? error.message : "unknown");
    return json({ error: "listing_submission_failed" }, 500, origin);
  }
});
