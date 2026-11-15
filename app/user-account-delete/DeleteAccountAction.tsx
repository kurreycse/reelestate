"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { supabase } from "../../lib/supabase";

function messageForDeletionError(code: string) {
  switch (code) {
    case "authentication_required":
      return "Your session has expired. Sign in again before requesting deletion.";
    case "confirmation_required":
    case "invalid_confirmation":
      return "Confirm that you want to permanently delete this account.";
    case "origin_not_allowed":
      return "Account deletion is unavailable from this website address.";
    case "server_not_configured":
      return "Account deletion is temporarily unavailable. Please contact support.";
    default:
      return "Your account could not be deleted. Your data has not been fully removed; please retry or contact support.";
  }
}

async function responseErrorCode(error: unknown) {
  const response = (error as { context?: Response }).context;
  if (!response) return "";
  try {
    const body = (await response.clone().json()) as { error?: string };
    return String(body.error || "");
  } catch {
    return "";
  }
}

function clearBrowserAccountData() {
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (
      key === "reelestate-instagram-access-token" ||
      key === "reelestate-instagram-account" ||
      key === "reelestate-instagram-reels" ||
      key?.startsWith("reelestate-instagram-reel-drafts:")
    ) {
      localStorage.removeItem(key);
    }
  }
}

export default function DeleteAccountAction({
  onCancel,
  onDeleted,
}: {
  onCancel?: () => void;
  onDeleted: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!confirmed || busy) return;

    setBusy(true);
    setError("");
    try {
      const { error: deletionError } = await supabase.functions.invoke(
        "delete-account",
        { body: { confirm: true } },
      );
      if (deletionError) {
        setError(messageForDeletionError(await responseErrorCode(deletionError)));
        setBusy(false);
        return;
      }
    } catch (requestError) {
      console.error(
        "Account deletion request could not be sent",
        requestError instanceof Error ? requestError.message : "unknown error",
      );
      setError(messageForDeletionError(""));
      setBusy(false);
      return;
    }

    try {
      clearBrowserAccountData();
    } catch (storageError) {
      console.error(
        "Deleted account browser data could not be cleared",
        storageError instanceof Error ? storageError.message : "unknown error",
      );
    }
    try {
      const { error: signOutError } = await supabase.auth.signOut({
        scope: "local",
      });
      if (signOutError) {
        console.error(
          "Deleted account session could not be cleared",
          signOutError.message,
        );
      }
    } catch (signOutError) {
      console.error(
        "Deleted account session could not be cleared",
        signOutError instanceof Error ? signOutError.message : "unknown error",
      );
    }
    setBusy(false);
    onDeleted();
  }

  return (
    <div className="account-delete-panel">
      <div className="account-delete-warning">
        <AlertTriangle aria-hidden="true" />
        <p>
          This permanently deletes your ReelEstate account, profile, listings,
          uploaded property media, and enquiries. This cannot be undone.
        </p>
      </div>
      <label className="account-delete-confirm">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          disabled={busy}
        />
        I understand that my account and associated data will be permanently
        deleted.
      </label>
      {error && (
        <p className="account-delete-error" role="alert">
          {error}
        </p>
      )}
      <div className="account-delete-actions">
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={() => void submit()}
          className="account-delete-submit"
          disabled={!confirmed || busy}
        >
          {busy ? <Loader2 className="spin" /> : <Trash2 />}
          {busy ? "Deleting account…" : "Delete my account permanently"}
        </button>
      </div>
    </div>
  );
}
