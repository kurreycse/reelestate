import type { Metadata } from "next";
import Link from "next/link";
import DeleteAccountRequest from "./DeleteAccountRequest";

export const metadata: Metadata = {
  title: "Delete your account | ReelEstate",
  description:
    "Request permanent deletion of your ReelEstate account and associated personal data.",
};

export default function UserAccountDeletePage() {
  return (
    <main className="legal-shell">
      <div className="legal-container">
        <Link href="/" className="legal-back-link">
          ← Back to ReelEstate
        </Link>
        <article className="legal-card">
          <p className="eyebrow">Account and data</p>
          <h1>Delete your ReelEstate account</h1>
          <p className="legal-meta">
            You can permanently delete your account at any time.
          </p>

          <section>
            <h2>What deletion removes</h2>
            <p>
              We delete your sign-in account and profile, your property
              listings and their uploaded video and poster files, and enquiries
              associated with your account. Feedback and publisher-interest
              records submitted with your account email or verified phone are
              also deleted. This action is permanent and cannot be undone.
            </p>
            <p>
              Moderation history may be retained in a de-identified form where
              needed to preserve the integrity of platform records. Information
              that must be retained to meet legal obligations is handled as
              described in our{" "}
              <Link href="/privacy">Privacy Policy</Link>.
            </p>
          </section>

          <section>
            <h2>Request deletion</h2>
            <p>
              Sign in to the account you want removed, review the confirmation,
              and select “Delete my account permanently.” You can also open{" "}
              <strong>My profile → Delete account</strong> while signed in on
              the ReelEstate website or app.
            </p>
            <DeleteAccountRequest />
          </section>
        </article>
      </div>
    </main>
  );
}
