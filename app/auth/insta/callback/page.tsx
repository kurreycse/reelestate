"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { appConfig } from "../../../../lib/config";

async function completeInstagramLogin() {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const denied = url.searchParams.has("error") || !code;

  window.history.replaceState(null, "", url.pathname);

  if (denied) {
    throw new Error(
      "Instagram sign-in was cancelled or the sign-in link has expired. Please try again.",
    );
  }

  const redirectUri = appConfig.instagram.redirectUri;
  const response = await fetch("/api/instagram/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, redirect_uri: redirectUri }),
  });

  const data = (await response.json()) as { access_token?: string; error?: string };
  if (!response.ok || !data.access_token) {
    throw new Error(
      data.error || "Instagram sign-in could not be verified. Please try again in the same browser tab.",
    );
  }

  localStorage.setItem("reelestate-instagram-access-token", data.access_token);
  window.opener?.postMessage(
    { type: "instagram-connected", accessToken: data.access_token },
    window.location.origin,
  );

  if (window.opener) {
    window.close();
  } else {
    window.location.replace("/");
  }
}

export default function InstagramCallbackPage() {
  const [error, setError] = useState("");

  useEffect(() => {
    void completeInstagramLogin().catch((reason: unknown) => {
      const message =
        reason instanceof Error
          ? reason.message
          : "Instagram sign-in could not be completed.";
      setError(message);
    });
  }, []);

  return (
    <main className="auth-modal" style={{ margin: "80px auto" }}>
      <h1>{error ? "Instagram connection failed" : "Connecting Instagram…"}</h1>
      {error ? (
        <>
          <p role="alert">{error}</p>
          <Link href="/">Return to ReelEstate and try again</Link>
        </>
      ) : (
        <p role="status">Please wait while we finish connecting your Instagram account.</p>
      )}
    </main>
  );
}
