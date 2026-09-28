"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function InstagramCallback() {
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(url.hash.slice(1));
      const accessToken =
        url.searchParams.get("access_token") || hash.get("access_token");
      const denied =
        url.searchParams.has("error") || hash.has("error") || !accessToken;

      window.history.replaceState(null, "", url.pathname);

      if (denied) {
        throw new Error(
          "Instagram sign-in was cancelled or the sign-in link has expired. Please try again.",
        );
      }

      localStorage.setItem("reelestate-instagram-access-token", accessToken);
      window.opener?.postMessage(
        { type: "instagram-connected", accessToken },
        window.location.origin,
      );
      window.close();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Instagram sign-in could not be completed.",
      );
    }
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
