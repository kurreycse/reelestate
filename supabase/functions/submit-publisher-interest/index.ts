import { createClient } from "@supabase/supabase-js";

const allowedOrigins = new Set([
  "https://reelestate.co.in",
  "https://www.reelestate.co.in",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5174",
]);

function corsHeaders(origin: string | null) {
  return {
    "access-control-allow-origin": origin && allowedOrigins.has(origin) ? origin : "https://reelestate.co.in",
    "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
    "access-control-allow-methods": "POST, OPTIONS",
    vary: "Origin",
  };
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "content-type": "application/json" },
  });
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return "";
}

Deno.serve(async request => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin);
  if (origin && !allowedOrigins.has(origin)) return json({ error: "origin_not_allowed" }, 403, origin);

  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 10_000) return json({ error: "payload_too_large" }, 413, origin);

    const payload = await request.json() as Record<string, unknown>;
    if (String(payload.website || "")) return json({ accepted: true }, 202, origin);

    const name = String(payload.name || "").trim().replace(/\s+/g, " ");
    const phone = normalizePhone(String(payload.phone || ""));
    const email = String(payload.email || "").trim().toLowerCase();
    const instagram = String(payload.instagram_id || "").trim().replace(/^@/, "") || null;
    if (name.length < 2 || name.length > 120 || !phone ||
      !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254 ||
      (instagram && !/^[A-Za-z0-9._]{1,30}$/.test(instagram))) {
      return json({ error: "invalid_lead_details" }, 400, origin);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) return json({ error: "server_not_configured" }, 500, origin);
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const ipHash = await sha256(`${forwarded}:${serviceKey.slice(-24)}`);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await admin.from("publisher_interests").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", oneHourAgo);
    if ((count || 0) >= 5) return json({ error: "rate_limit_exceeded" }, 429, origin);

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: duplicate } = await admin.from("publisher_interests").select("id").eq("phone_e164", phone).gte("created_at", oneDayAgo).limit(1).maybeSingle();
    if (duplicate) return json({ accepted: true }, 202, origin);

    const { data: lead, error: insertError } = await admin.from("publisher_interests").insert({
      name, phone_e164: phone, email, instagram_id: instagram, ip_hash: ipHash,
    }).select("id").single();
    if (insertError) throw insertError;

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("LEAD_FROM_EMAIL");
    if (resendKey && fromEmail) {
      const mailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${resendKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          from: fromEmail,
          to: ["kurrey007@gmail.com"],
          subject: "New ReelEstate publisher interest",
          text: `Name: ${name}\nPhone: ${phone}\nEmail: ${email}\nInstagram: ${instagram ? `@${instagram}` : "Not provided"}\nLead ID: ${lead.id}`,
        }),
      });
      const result = await mailResponse.json().catch(() => ({})) as { id?: string; message?: string };
      await admin.from("publisher_interests").update({
        email_delivery_status: mailResponse.ok ? "sent" : "failed",
        email_provider_id: result.id || null,
        email_error: mailResponse.ok ? null : String(result.message || `HTTP ${mailResponse.status}`).slice(0, 500),
      }).eq("id", lead.id);
    }

    return json({ accepted: true }, 201, origin);
  } catch (error) {
    console.error("Publisher interest submission failed", error instanceof Error ? error.message : error);
    return json({ error: "submission_failed" }, 500, origin);
  }
});
