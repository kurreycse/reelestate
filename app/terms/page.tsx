import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use — ReelEstate",
  description: "Terms for publishing and discovering property videos on ReelEstate.",
};

export default function TermsPage(){return <main className="legal-page"><Link href="/">← Back to ReelEstate</Link><article><span>ReelEstate</span><h1>Terms of Use</h1><p className="legal-updated">Last updated: 9 September 2026</p><h2>Using the platform</h2><p>ReelEstate helps people publish and discover property video listings. You must provide accurate information, have permission to share submitted media and contact details, and comply with applicable property and advertising laws.</p><h2>Listing review</h2><p>A “Video checked” label means we reviewed the submitted video and listing content against our publication rules. It does not mean ReelEstate verified ownership, title, legal status, contact identity, availability or the accuracy of every claim.</p><h2>Your responsibility</h2><p>Property seekers must independently confirm ownership, availability, pricing, documents and legal status before visiting, sharing personal information or making payments. Never send money solely because a listing appears on ReelEstate.</p><h2>Content and moderation</h2><p>You retain responsibility for content you submit and grant ReelEstate permission to display it for operating and promoting the service. We may reject, edit, suspend or remove misleading, unlawful, unsafe or outdated listings.</p><h2>Contact</h2><p>Questions about these terms can be sent through the Feedback option on ReelEstate.</p></article></main>}
