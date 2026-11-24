import { Webhook } from "npm:standardwebhooks@1.0.0";

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const signingSecret = Deno.env.get("SEND_SMS_HOOK_SECRET");
  const apiKey = Deno.env.get("WHATSAPP_OTP_API_KEY");
  if (!signingSecret || !apiKey) return json({ error: "server_not_configured" }, 500);

  try {
    const payload = await request.text();
    const secret = signingSecret.replace(/^v1,whsec_/, "");
    const hook = new Webhook(secret);
    const event = hook.verify(payload, Object.fromEntries(request.headers)) as {
      user?: { phone?: string };
      sms?: { otp?: string };
    };
    const rawPhone = String(event.user?.phone || "");
    const phoneDigits = rawPhone.replace(/\D/g, "");
    const phone = rawPhone.startsWith("+")
      ? `+${phoneDigits}`
      : phoneDigits.length === 10
        ? `+91${phoneDigits}`
        : phoneDigits.startsWith("91")
          ? `+${phoneDigits}`
          : "";
    const otp = String(event.sms?.otp || "").replace(/\D/g, "");

    if (!/^\+91[6-9]\d{9}$/.test(phone) || !/^\d{6}$/.test(otp)) {
      console.error("WhatsApp OTP hook received invalid fields", {
        phoneDigits: phoneDigits.length,
        otpDigits: otp.length,
      });
      return json({ error: "invalid_auth_event" }, 400);
    }

    const destination = new URL("https://whatsapp.renflair.in/V1.php");
    destination.searchParams.set("API", apiKey);
    destination.searchParams.set("PHONE", phone.slice(3));
    destination.searchParams.set("OTP", otp);
    destination.searchParams.set("COUNTRY", "91");

    const providerResponse = await fetch(destination, { method: "GET", signal: AbortSignal.timeout(10000) });
    if (!providerResponse.ok) {
      console.error("WhatsApp OTP provider returned an error", providerResponse.status);
      return json({ error: "otp_delivery_failed" }, 502);
    }

    return json({}, 200);
  } catch (error) {
    console.error("WhatsApp SMS hook request failed");
    return json({ error: "otp_delivery_failed" }, 500);
  }
});
