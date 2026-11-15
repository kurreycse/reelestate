import type { Metadata } from "next";
import Link from "next/link";
import DeleteAccountRequest from "./DeleteAccountRequest";

export const metadata: Metadata = {
  title: "Facebook data deletion | ReelEstate",
  description:
    "Instructions to delete your ReelEstate account and the data associated with Facebook Login.",
};

export default function UserAccountDeletePage() {
  return (
    <main className="legal-shell">
      <div className="legal-container">
        <Link href="/" className="legal-back-link">
          ← Back to ReelEstate
        </Link>
        <article className="legal-card">
          <p className="eyebrow">Facebook data deletion</p>
          <h1>Delete your ReelEstate account</h1>
          <p className="legal-meta">
            Use this page to request permanent deletion of your ReelEstate
            account and the personal data associated with it.
          </p>

          <section>
            <h2>What deletion removes</h2>
            <p>
              We delete your ReelEstate sign-in account, including its
              Facebook Login association, your profile, property listings and
              uploaded video and poster files, and enquiries associated with
              your account. Feedback and publisher-interest records submitted
              with your account email or verified phone are also deleted. This
              action is permanent and cannot be undone.
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
            <h2>How to request deletion</h2>
            <p>
              Sign in with the Facebook account you used on ReelEstate. Then
              review the confirmation and select “Delete my account
              permanently” below, or open{" "}
              <strong>My profile → Delete account</strong> from the account
              menu on ReelEstate.
            </p>
            <ol className="account-deletion-steps">
              <li>Sign in with Facebook to verify that you own the account.</li>
              <li>Review the data that will be deleted.</li>
              <li>Confirm permanent deletion of your ReelEstate account.</li>
            </ol>
            <DeleteAccountRequest />
          </section>

          <section>
            <h2>Facebook account</h2>
            <p>
              Deleting your ReelEstate account does not delete your Facebook
              account. To remove ReelEstate from the apps connected to
              Facebook, visit{" "}
              <a
                href="https://www.facebook.com/settings/?tab=applications"
                target="_blank"
                rel="noreferrer"
              >
                Facebook Apps and Websites settings
              </a>
              .
            </p>
          </section>
        </article>
      </div>
    </main>
  );
}
