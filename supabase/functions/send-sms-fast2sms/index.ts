import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

interface SendSmsEvent {
  user?: { phone?: string };
  sms?: { otp?: string };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const apiKey = Deno.env.get("FAST2SMS_API_KEY");
  const hookSecrets = Deno.env.get("SEND_SMS_HOOK_SECRETS");
  if (!apiKey || !hookSecrets) return json({ error: "server_not_configured" }, 500);

  try {
    const rawBody = await request.text();
    const hookSecret = hookSecrets.split("|")[0].replace(/^v1,whsec_/, "");
    const event = new Webhook(hookSecret).verify(rawBody, {
      "webhook-id": request.headers.get("webhook-id") ?? "",
      "webhook-timestamp": request.headers.get("webhook-timestamp") ?? "",
      "webhook-signature": request.headers.get("webhook-signature") ?? "",
    }) as SendSmsEvent;

    const phoneDigits = event.user?.phone?.replace(/\D/g, "") ?? "";
    const mobile = phoneDigits.startsWith("91") && phoneDigits.length === 12
      ? phoneDigits.slice(2)
      : phoneDigits;
    const otp = event.sms?.otp ?? "";

    if (!/^\d{10}$/.test(mobile) || !/^\d{4,10}$/.test(otp)) {
      return json({ error: "invalid_sms_payload" }, 400);
    }

    const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
      method: "POST",
      headers: {
        authorization: apiKey,
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        route: "otp",
        variables_values: otp,
        numbers: mobile,
        flash: "0",
      }),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok || result?.return !== true) {
      const providerCode = String(result?.status_code ?? response.status);
      const providerMessage = Array.isArray(result?.message)
        ? result.message.join(", ")
        : String(result?.message ?? "Fast2SMS rejected the OTP request");
      console.error("Fast2SMS rejected OTP request", {
        status: response.status,
        code: providerCode,
        message: providerMessage,
      });
      return json({
        error: {
          http_code: 502,
          message: `Fast2SMS ${providerCode}: ${providerMessage}`,
        },
      }, 502);
    }

    return json({});
  } catch (error) {
    console.error("Send SMS hook verification failed", error instanceof Error ? error.message : error);
    return json({ error: "invalid_hook_signature" }, 401);
  }
});
