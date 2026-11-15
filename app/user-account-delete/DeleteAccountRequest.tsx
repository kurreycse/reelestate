"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import DeleteAccountAction from "./DeleteAccountAction";

export default function DeleteAccountRequest() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) console.error("Could not check account deletion session", error);
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) setSession(nextSession);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  if (deleted) {
    return (
      <div className="account-delete-complete" role="status">
        <h3>Account deleted</h3>
        <p>
          Your ReelEstate account and associated data have been permanently
          deleted.
        </p>
        <Link href="/">Return to ReelEstate</Link>
      </div>
    );
  }

  if (!ready) {
    return <p aria-live="polite">Checking your sign-in status…</p>;
  }

  if (!session) {
    return (
      <div className="account-delete-signin">
        <p>
          To protect your account, sign in with the account you want to delete.
          You can then return to this page or delete it from My profile in the
          app.
        </p>
        <Link href="/">Go to ReelEstate to sign in</Link>
      </div>
    );
  }

  return <DeleteAccountAction onDeleted={() => setDeleted(true)} />;
}
