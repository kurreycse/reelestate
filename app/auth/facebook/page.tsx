"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

// Share one exchange across React Strict Mode effect replays. OAuth codes are single-use.
let completion: Promise<void> | undefined;
async function completeFacebookLogin() {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const denied = url.searchParams.has("error") || new URLSearchParams(url.hash.slice(1)).has("error");
  window.history.replaceState(null, "", url.pathname);
  if (denied || !code) throw new Error("Facebook sign-in was cancelled or the sign-in link has expired. Please try again.");
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw new Error("Facebook sign-in could not be verified. Please try again in the same browser tab.");
  const { error: profileError } = await supabase.rpc("complete_facebook_registration");
  if (profileError) {
    await supabase.auth.signOut();
    throw new Error("Your account could not be prepared. Please try again shortly.");
  }
  window.location.replace("/");
}

export default function FacebookCallback() {
  const [error, setError] = useState("");
  useEffect(() => {
    completion ??= completeFacebookLogin();
    let active = true;
    void completion.catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Sign-in failed. Please try again.");
    });
    return () => { active = false; };
  }, []);
  return <main className="auth-modal" style={{ margin: "80px auto" }}>
    <h1>{error ? "Unable to sign in" : "Signing you in…"}</h1>
    {error ? <><p role="alert">{error}</p><Link href="/">Return to ReelEstate and try again</Link></> : <p role="status">Completing your Facebook sign-in.</p>}
  </main>;
}
