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
const corsHeaders = (origin: string | null) => ({
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
    headers: {
      ...corsHeaders(origin),
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin);
  if (origin && !allowedOrigins.has(origin)) return json({ error: "origin_not_allowed" }, 403, origin);

  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 24000) {
      return json({ error: "payload_too_large" }, 413, origin);
    }
    const input = JSON.parse(raw) as Record<string, unknown>;
    const bearer = request.headers.get("authorization") || "";
    const authToken = bearer.replace(/^Bearer\s+/i, "");
    if (!authToken) return json({ error: "authentication_required" }, 401, origin);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) return json({ error: "server_not_configured" }, 500, origin);
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: { user }, error: authError } = await admin.auth.getUser(authToken);
    if (authError || !user) return json({ error: "authentication_required" }, 401, origin);
    const { data: profile } = await admin.from("profiles").select("is_active").eq("id", user.id).maybeSingle();
    if (!profile?.is_active) return json({ error: "account_inactive" }, 403, origin);

    const mediaId = String(input.instagram_media_id || "").trim();
    const sourceUrl = String(input.instagram_source_url || "").trim();
    const accessToken = String(input.instagram_access_token || "").trim();
    if (!/^\d{1,32}$/.test(mediaId) || !accessToken || !uuid.test(String(input.id || ""))) {
      return json({ error: "invalid_instagram_reel" }, 400, origin);
    }

    let submittedUrl: URL;
    try {
      submittedUrl = new URL(sourceUrl);
    } catch {
      return json({ error: "invalid_instagram_reel" }, 400, origin);
    }
    if (
      submittedUrl.protocol !== "https:" ||
      !["instagram.com", "www.instagram.com"].includes(submittedUrl.hostname) ||
      !/^\/(reel|reels|p)\/[A-Za-z0-9_-]+\/?$/.test(submittedUrl.pathname)
    ) return json({ error: "invalid_instagram_reel" }, 400, origin);

    const graphUrl = new URL(`https://graph.instagram.com/v20.0/${encodeURIComponent(mediaId)}`);
    graphUrl.searchParams.set("fields", "id,permalink,media_type,media_product_type");
    graphUrl.searchParams.set("access_token", accessToken);
    const graphResponse = await fetch(graphUrl, { cache: "no-store" });
    const reel = await graphResponse.json() as {
      id?: string;
      permalink?: string;
      media_type?: string;
      media_product_type?: string;
      error?: { code?: number; type?: string; message?: string };
    };
    const normalizeUrl = (value: string) => {
      const parsed = new URL(value);
      const path = parsed.pathname.endsWith("/") ? parsed.pathname.slice(0, -1) : parsed.pathname;
      return `${parsed.origin}${path}`;
    };
    if (!graphResponse.ok || reel.error) {
      const expired = graphResponse.status === 401 || reel.error?.type === "OAuthException";
      console.error("Instagram reel verification request failed", {
        status: graphResponse.status,
        providerCode: reel.error?.code,
      });
      return json(
        { error: expired ? "instagram_connection_expired" : "instagram_reel_verification_failed" },
        expired ? 401 : 502,
        origin,
      );
    }
    if (
      reel.id !== mediaId ||
      reel.media_type !== "VIDEO" ||
      reel.media_product_type !== "REELS" ||
      !reel.permalink ||
      normalizeUrl(reel.permalink) !== normalizeUrl(submittedUrl.toString())
    ) return json({ error: "instagram_reel_verification_failed" }, 400, origin);

    const title = String(input.title || "").trim();
    const description = String(input.description || "").trim();
    const city = String(input.city || "").trim();
    const locality = String(input.locality || "").trim();
    const contactPhone = String(input.contact_phone || "").trim();
    const purpose = String(input.purpose || "");
    const propertyType = String(input.property_type || "");
    const postedBy = String(input.posted_by || "owner");
    const contactPreference = String(input.contact_preference || "both");
    const priceMinor = Number(input.price_minor);
    const fieldErrors: Record<string, string> = {};
    if (title.length < 5 || title.length > 120) fieldErrors.title = "Enter a title between 5 and 120 characters.";
    if (description.length < 20 || description.length > 2000) fieldErrors.description = "Enter a description between 20 and 2,000 characters.";
    if (city.length < 2 || city.length > 100) fieldErrors.city = "Enter a valid city.";
    if (locality.length < 2 || locality.length > 150) fieldErrors.locality = "Enter a valid locality.";
    if (contactPhone.length < 8 || contactPhone.length > 20) fieldErrors.contact_phone = "Enter a valid contact number.";
    if (!["sale", "rent"].includes(purpose)) fieldErrors.purpose = "Choose sale or rent.";
    if (!["Apartment", "Villa", "Independent house", "Plot", "Commercial"].includes(propertyType)) fieldErrors.property_type = "Choose a property type.";
    if (!Number.isSafeInteger(priceMinor) || priceMinor <= 0) fieldErrors.price_minor = "Enter a valid price.";
    if (!["owner", "agent", "builder"].includes(postedBy)) fieldErrors.posted_by = "Choose who is posting the property.";
    if (!["call", "whatsapp", "both"].includes(contactPreference)) fieldErrors.contact_preference = "Choose a contact preference.";
    if (Object.keys(fieldErrors).length) {
      return json({ error: "invalid_listing_details", field_errors: fieldErrors }, 400, origin);
    }

    const listingData: Record<string, unknown> = {
      id: input.id,
      title,
      description,
      city,
      locality,
      contact_phone: contactPhone,
      purpose,
      property_type: propertyType,
      posted_by: postedBy,
      contact_preference: contactPreference,
      price_minor: priceMinor,
      video_path: null,
      poster_path: null,
      video_duration_seconds: 1,
      instagram_source_url: reel.permalink,
      instagram_media_id: mediaId,
      furnishing_status: null,
      ownership_type: purpose === "sale" ? "freehold" : null,
      possession_status: purpose === "sale" ? "ready_to_move" : null,
      available_from: null,
      security_deposit_minor: null,
      maintenance_minor: null,
      tenant_preference: null,
      bedrooms: null,
      bathrooms: null,
      carpet_area_sqft: null,
      builtup_area_sqft: null,
      property_age_years: 0,
      floor_number: 0,
      total_floors: null,
      parking_spaces: 0,
      facing: null,
      project_name: null,
      amenities: [],
    };

    const { data: listingId, error: saveError } = await admin.rpc("create_validated_listing", {
      p_owner_id: user.id,
      p_data: listingData,
    });
    if (saveError) {
      console.error("Instagram listing database save failed", {
        code: saveError.code,
        message: saveError.message,
      });
      if (["PGRST202", "42883", "42P10"].includes(saveError.code || "")) {
        return json({ error: "listing_database_not_ready" }, 503, origin);
      }
      throw saveError;
    }

    await notifyListing(admin, "listing_submitted", {
      id: String(listingId),
      owner_id: user.id,
      title,
      city,
      locality,
    });
    return json({ accepted: true, listing_id: listingId }, 201, origin);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "listing_submission_failed";
    console.error("Instagram listing save failed", detail);
    if (detail.includes("INSTAGRAM_REEL_ALREADY_LISTED_BY_ANOTHER_OWNER")) {
      return json({ error: "instagram_reel_already_listed" }, 409, origin);
    }
    const errorCode = detail.includes("invalid") ? detail : "listing_submission_failed";
    return json({ error: errorCode }, 400, origin);
  }
});
