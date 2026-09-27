import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | ReelEstate",
  description:
    "How ReelEstate handles personal data, social login, property information, and user privacy.",
};

export default function PrivacyPage() {
  return (
    <main className="legal-shell">
      <div className="legal-container">
        <Link href="/" className="legal-back-link">
          ← Back to home
        </Link>

        <article className="legal-card">
          <p className="eyebrow">Privacy Policy</p>
          <h1>Privacy Policy</h1>
          <p className="legal-meta">Effective date: 27 September 2026</p>

          <section>
            <h2>1. Information we collect</h2>
            <p>
              ReelEstate collects the information needed to create and manage your
              account, support property discovery, and provide contact and listing
              services. This includes your name, email address, phone number,
              profile details, Instagram handle, listing information, property
              preferences, and communications you send through the platform.
            </p>
            <p>
              When you choose to sign in with Facebook or Instagram, we may receive
              basic profile information from those providers, such as your name,
              email address, profile picture, and public profile identifier, as
              permitted by the provider and the permissions you grant. We use this
              only to create or improve your account and to personalize your
              experience on ReelEstate.
            </p>
          </section>

          <section>
            <h2>2. How we use your data</h2>
            <p>
              We use personal data to operate the platform, verify your account,
              allow property enquiries, manage publisher listings, display relevant
              discoveries, respond to requests, prevent misuse, maintain security,
              and send service notifications or updates relevant to your account.
            </p>
            <p>
              We may also use aggregated analytics to understand product usage,
              identify issues, and improve the website. This information is kept as
              de-identified or aggregated where possible.
            </p>
          </section>

          <section>
            <h2>3. Social login and third-party services</h2>
            <p>
              If you log in using Facebook or Instagram, you are also subject to
              the privacy practices of those providers. We only request the minimum
              information required to provide account access and support the
              features on ReelEstate.
            </p>
            <p>
              We do not sell your personal information. We may share data with
              service providers that help us run the platform, such as hosting,
              authentication, messaging, analytics, and moderation systems, but
              only under confidentiality obligations and for the purposes described
              in this policy.
            </p>
          </section>

          <section>
            <h2>4. Property and listing data</h2>
            <p>
              Property listings may include photos, videos, descriptions,
              addresses, pricing, amenities, and contact details. If you publish
              property information, you are responsible for ensuring the content is
              accurate, lawful, and compliant with applicable laws and platform
              guidelines. We may review or moderate content for safety,
              compliance, and quality.
            </p>
          </section>

          <section>
            <h2>5. Cookies and device information</h2>
            <p>
              We may use cookies, local storage, and similar technologies to keep
              you signed in, remember preferences, understand traffic patterns, and
              support security features. You can disable cookies in your browser,
              but certain features may not work as intended.
            </p>
          </section>

          <section>
            <h2>6. Data retention</h2>
            <p>
              We retain personal data for as long as necessary to provide the
              service, comply with legal obligations, resolve disputes, and enforce
              our agreements. If your account is removed or you request deletion,
              we will delete or anonymize data in line with the applicable legal and
              operational requirements.
            </p>
          </section>

          <section>
            <h2>7. Your rights</h2>
            <p>
              Depending on your location, you may have rights to access, correct,
              update, restrict, or delete the personal data we hold about you, and
              to withdraw consent where processing is based on consent. You may
              also object to certain processing activities. To exercise those
              rights, please contact us using the details below.
            </p>
          </section>

          <section>
            <h2>8. Security</h2>
            <p>
              We use commercially reasonable technical and organisational
              safeguards to protect personal data from loss, misuse, unauthorised
              access, and disclosure. No system is completely secure, so we
              encourage you to protect your login credentials and keep your account
              information up to date.
            </p>
          </section>

          <section>
            <h2>9. Contact</h2>
            <p>
              If you have questions about this Privacy Policy or how your data is
              handled, contact us through the support or enquiry channels available
              on ReelEstate and we will respond as quickly as reasonably possible.
            </p>
          </section>

          <p className="legal-footer">
            This policy may be updated from time to time. Continued use of the
            platform after changes are posted means that you accept the updated
            policy.
          </p>
        </article>
      </div>
    </main>
  );
}
