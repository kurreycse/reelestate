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
          To protect your data, sign in with Facebook using the account you
          want to delete. After sign-in, you will return here to confirm
          deletion.
        </p>
        <Link className="primary full" href="/?accountDeletion=1">
          Sign in with Facebook to continue
        </Link>
      </div>
    );
  }

  return <DeleteAccountAction onDeleted={() => setDeleted(true)} />;
}
