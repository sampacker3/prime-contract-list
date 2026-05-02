import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

const LAST_UPDATED = "2 May 2025";
const COMPANY_NAME = "IT ContractHub";
const COMPANY_EMAIL = "hello@itcontracthub.co.uk";
const SITE_URL = "https://itcontracthub.co.uk";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-heading font-semibold text-foreground text-base mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export default function Privacy() {
  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Privacy Policy — IT ContractHub"
        description="Read the IT ContractHub Privacy Policy to understand how we collect, use, and protect your personal data."
        canonical="/privacy"
      />
      <Navbar />

      <main className="flex-1">
        {/* Header */}
        <section className="border-b bg-surface-subtle py-10">
          <div className="container max-w-3xl">
            <h1 className="font-heading font-bold text-3xl text-foreground mb-2">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
          </div>
        </section>

        {/* Content */}
        <section className="py-10">
          <div className="container max-w-3xl">
            <div className="space-y-10 text-sm text-foreground/80 leading-relaxed">

              <div>
                <p>
                  This Privacy Policy explains how {COMPANY_NAME} ("we", "us", or "our") collects, uses,
                  and protects your personal information when you use{" "}
                  <a href={SITE_URL} className="text-primary hover:underline">{SITE_URL}</a> (the "Platform").
                  By using the Platform you agree to the collection and use of information as described in this policy.
                </p>
              </div>

              <Section title="1. Who we are">
                <p>
                  IT ContractHub is a UK-based platform that aggregates IT contract job listings from publicly
                  available sources. If you have any questions about this policy, contact us at{" "}
                  <a href={`mailto:${COMPANY_EMAIL}`} className="text-primary hover:underline">{COMPANY_EMAIL}</a>.
                </p>
              </Section>

              <Section title="2. Information we collect">
                <p>We collect the following categories of personal data:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <strong className="text-foreground">Account information</strong> — your name and email address,
                    provided when you register via email or Google Sign-In.
                  </li>
                  <li>
                    <strong className="text-foreground">CV / résumé data</strong> — if you choose to upload a CV,
                    we store it securely to power features such as contract matching and AI cover letter generation.
                  </li>
                  <li>
                    <strong className="text-foreground">Usage data</strong> — pages visited, searches performed,
                    contracts saved, and alerts created, used to improve the Platform.
                  </li>
                  <li>
                    <strong className="text-foreground">Payment information</strong> — if you subscribe to a Pro plan,
                    payments are processed by Stripe. We do not store your card details.
                  </li>
                  <li>
                    <strong className="text-foreground">Communications</strong> — if you contact us via the contact
                    form or email, we retain that correspondence.
                  </li>
                </ul>
              </Section>

              <Section title="3. How we use your information">
                <p>We use your personal data to:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Create and manage your account</li>
                  <li>Provide the Platform's features, including contract search, saved jobs, and email alerts</li>
                  <li>Generate AI-powered cover letters and contract match scores using your CV</li>
                  <li>Process subscription payments via Stripe</li>
                  <li>Send transactional emails (account verification, password reset, alert notifications)</li>
                  <li>Respond to your support enquiries</li>
                  <li>Improve the Platform through aggregated, anonymised usage analytics</li>
                  <li>Comply with our legal obligations</li>
                </ul>
                <p>
                  We do not sell your personal data to third parties. We do not use your data for advertising purposes.
                </p>
              </Section>

              <Section title="4. Google Sign-In">
                <p>
                  If you sign in using Google, we receive your name, email address, and profile picture from Google
                  as part of the OAuth authentication flow. We use this information solely to create and manage your
                  account on the Platform.
                </p>
                <p>
                  We do not access your Google Drive, Gmail, Calendar, or any other Google services. The only
                  permissions we request are your basic profile information and email address.
                </p>
                <p>
                  You can revoke IT ContractHub's access to your Google account at any time via your{" "}
                  <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Google Account permissions page
                  </a>.
                </p>
              </Section>

              <Section title="5. Data sharing and third parties">
                <p>We share your data only with the following trusted third parties, and only to the extent necessary:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <strong className="text-foreground">Supabase</strong> — our database and authentication provider,
                    used to store your account data and CV securely.
                  </li>
                  <li>
                    <strong className="text-foreground">Stripe</strong> — payment processing for Pro subscriptions.
                    Stripe is PCI DSS compliant.
                  </li>
                  <li>
                    <strong className="text-foreground">Google</strong> — if you use Google Sign-In, authentication
                    is handled via Google OAuth 2.0.
                  </li>
                  <li>
                    <strong className="text-foreground">n8n (automation)</strong> — used internally to trigger
                    AI processing of your CV and cover letter generation. Your data is processed transiently
                    and not retained by this service beyond the immediate task.
                  </li>
                </ul>
                <p>
                  We do not share your data with recruiters, employers, or any other third parties without your
                  explicit consent.
                </p>
              </Section>

              <Section title="6. Data retention">
                <p>
                  We retain your personal data for as long as your account is active. If you delete your account,
                  we will delete your personal data within 30 days, except where we are required to retain it for
                  legal or financial compliance reasons (e.g. payment records, which are retained for 7 years
                  under UK tax law).
                </p>
                <p>
                  Uploaded CVs are deleted immediately upon account deletion or when you remove them via your
                  account settings.
                </p>
              </Section>

              <Section title="7. Your rights">
                <p>Under UK GDPR and the Data Protection Act 2018, you have the right to:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong className="text-foreground">Access</strong> — request a copy of the personal data we hold about you</li>
                  <li><strong className="text-foreground">Rectification</strong> — ask us to correct inaccurate data</li>
                  <li><strong className="text-foreground">Erasure</strong> — request deletion of your personal data</li>
                  <li><strong className="text-foreground">Portability</strong> — receive your data in a machine-readable format</li>
                  <li><strong className="text-foreground">Restriction</strong> — ask us to limit how we use your data</li>
                  <li><strong className="text-foreground">Objection</strong> — object to processing based on legitimate interests</li>
                </ul>
                <p>
                  To exercise any of these rights, email us at{" "}
                  <a href={`mailto:${COMPANY_EMAIL}`} className="text-primary hover:underline">{COMPANY_EMAIL}</a>.
                  We will respond within 30 days. You also have the right to lodge a complaint with the{" "}
                  <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Information Commissioner's Office (ICO)
                  </a>.
                </p>
              </Section>

              <Section title="8. Cookies">
                <p>
                  We use only essential cookies required for authentication and session management. We do not
                  use tracking cookies or third-party advertising cookies. No cookie consent banner is required
                  as we only use strictly necessary cookies.
                </p>
              </Section>

              <Section title="9. Security">
                <p>
                  We take the security of your data seriously. All data is stored on Supabase infrastructure
                  with encryption at rest and in transit (TLS). Access to your data is controlled via
                  Row Level Security policies, meaning only you can access your own data.
                </p>
                <p>
                  Despite these measures, no method of transmission over the internet is 100% secure.
                  We will notify you promptly in the event of any data breach that affects your personal data.
                </p>
              </Section>

              <Section title="10. Children's privacy">
                <p>
                  The Platform is intended for adults seeking IT contract employment. We do not knowingly
                  collect personal data from anyone under the age of 18. If you believe a child has provided
                  us with personal data, please contact us and we will delete it promptly.
                </p>
              </Section>

              <Section title="11. Changes to this policy">
                <p>
                  We may update this Privacy Policy from time to time. When we do, we will update the
                  "Last updated" date at the top of this page. We encourage you to review this policy
                  periodically. Continued use of the Platform after changes constitutes acceptance of
                  the updated policy.
                </p>
              </Section>

              <Section title="12. Contact us">
                <p>
                  If you have any questions, concerns, or requests regarding this Privacy Policy, please
                  contact us:
                </p>
                <ul className="list-none space-y-1">
                  <li><strong className="text-foreground">Email:</strong>{" "}
                    <a href={`mailto:${COMPANY_EMAIL}`} className="text-primary hover:underline">{COMPANY_EMAIL}</a>
                  </li>
                  <li><strong className="text-foreground">Website:</strong>{" "}
                    <Link to="/contact" className="text-primary hover:underline">itcontracthub.co.uk/contact</Link>
                  </li>
                </ul>
              </Section>

            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
