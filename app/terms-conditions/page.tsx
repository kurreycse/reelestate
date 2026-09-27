import Link from "next/link";

export const metadata = {
  title: "Terms & Conditions | ReelEstate",
  description:
    "Terms and conditions for using ReelEstate, including account creation, social logins, listings, and platform rules.",
};

export default function TermsConditionsPage() {
  return (
    <main className="legal-shell">
      <div className="legal-container">
        <Link href="/" className="legal-back-link">
          ← Back to home
        </Link>

        <article className="legal-card">
          <p className="eyebrow">Terms & Conditions</p>
          <h1>Terms & Conditions</h1>
          <p className="legal-meta">Effective date: 27 September 2026</p>

          <section>
            <h2>1. Acceptance of terms</h2>
            <p>
              By accessing or using ReelEstate, you agree to be bound by these
              Terms & Conditions and our Privacy Policy. If you do not agree, you
              must not access or use the website or any of its services.
            </p>
          </section>

          <section>
            <h2>2. Account creation and social login</h2>
            <p>
              You are responsible for keeping your account details accurate and
              secure. If you choose to create an account or sign in using Facebook
              or Instagram, you confirm that you are authorised to use that
              account and that you have reviewed the permissions requested by the
              provider.
            </p>
            <p>
              We may suspend or restrict access if we believe the account is being
              used fraudulently, in breach of these terms, or in a way that harms
              the platform or other users.
            </p>
          </section>

          <section>
            <h2>3. Website usage</h2>
            <p>
              ReelEstate is a platform for discovering property opportunities,
              viewing listings, communicating with vendors or listing owners, and
              managing promotional or genuine property content. You agree not to use
              the service for spam, fraud, unlawful activity, harassment, or any
              activity that interferes with the normal operation of the platform.
            </p>
          </section>

          <section>
            <h2>4. Content and listings</h2>
            <p>
              If you submit property content, including videos, images, descriptions,
              pricing details, contact information, or related materials, you
              represent that you have the authority to publish the content and that
              it is accurate, lawful, and not misleading.
            </p>
            <p>
              We may review, moderate, reject, or remove content that violates our
              guidelines, local legal requirements, or the expectations of other
              users. We do not guarantee that all listings will be approved or that
              all information will be complete, accurate, or current.
            </p>
          </section>

          <section>
            <h2>5. User responsibilities</h2>
            <p>
              You agree to use ReelEstate in a lawful, respectful, and honest
              manner. You must not impersonate another person, misrepresent your
              identity, use automated tools to manipulate the platform, or engage in
              abusive or unlawful conduct.
            </p>
            <p>
              Any legal, financial, or property-related decisions made based on the
              information on this platform are solely your responsibility.
            </p>
          </section>

          <section>
            <h2>6. Intellectual property</h2>
            <p>
              ReelEstate retains ownership of the website design, branding,
              software, and other original materials associated with the platform,
              except where otherwise stated. By posting content, you retain rights
              in your own material, but you grant ReelEstate a limited right to host,
              process, display, and distribute that content for the purpose of
              operating the platform.
            </p>
          </section>

          <section>
            <h2>7. Availability and no warranty</h2>
            <p>
              ReelEstate is provided on an “as is” and “as available” basis. We do
              not guarantee uninterrupted access, error-free operation, or that the
              platform will meet all of your expectations. We may update, modify,
              suspend, or discontinue the service at any time without notice.
            </p>
          </section>

          <section>
            <h2>8. Limitation of liability</h2>
            <p>
              To the maximum extent permitted by law, ReelEstate shall not be liable
              for indirect, incidental, special, consequential, or punitive damages
              arising out of or related to your use of the platform, including
              losses from property disputes, transactions, content inaccuracies, or
              service interruptions.
            </p>
          </section>

          <section>
            <h2>9. Termination</h2>
            <p>
              We may suspend or terminate your access to the platform if you breach
              these Terms & Conditions, misuse the service, or create risk to other
              users or the business. Upon termination, your access to the platform
              may be restricted, and any relevant content may be removed or archived
              as required by law or operational policy.
            </p>
          </section>

          <section>
            <h2>10. Changes to these terms</h2>
            <p>
              We may update these terms from time to time to reflect changes in the
              service, legal requirements, or business operations. Continued use of
              ReelEstate after an update constitutes acceptance of the revised
              terms.
            </p>
          </section>

          <section>
            <h2>11. Contact</h2>
            <p>
              If you have any questions about these Terms & Conditions, please use
              the contact and support channels provided on ReelEstate.
            </p>
          </section>

          <p className="legal-footer">
            These terms are designed to support a safe, transparent, and compliant
            property discovery experience for all users.
          </p>
        </article>
      </div>
    </main>
  );
}
