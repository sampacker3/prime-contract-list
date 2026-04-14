import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

const LAST_UPDATED = "14 April 2025";
const COMPANY_NAME = "ContractHub";
const COMPANY_EMAIL = "legal@contracthub.co.uk";
const SITE_URL = "https://contracthub.co.uk";

export default function Terms() {
  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Terms & Conditions — ContractHub"
        description="Read the ContractHub Terms and Conditions governing use of the platform, subscriptions, and content."
        canonical="/terms"
      />
      <Navbar />

      <main className="flex-1">
        {/* Header */}
        <section className="border-b bg-surface-subtle py-10">
          <div className="container max-w-3xl">
            <h1 className="font-heading font-bold text-3xl text-foreground mb-2">Terms &amp; Conditions</h1>
            <p className="text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
          </div>
        </section>

        {/* Content */}
        <section className="py-10">
          <div className="container max-w-3xl prose prose-sm prose-neutral max-w-none">

            <div className="space-y-10 text-sm text-foreground/80 leading-relaxed">

              <div>
                <p>
                  Please read these Terms &amp; Conditions ("Terms") carefully before using{" "}
                  <a href={SITE_URL} className="text-primary hover:underline">{SITE_URL}</a> (the "Platform")
                  operated by {COMPANY_NAME} ("we", "us", or "our"). By accessing or using the Platform you
                  agree to be bound by these Terms. If you do not agree, please do not use the Platform.
                </p>
              </div>

              <Section title="1. About ContractHub">
                <p>
                  ContractHub is a software-as-a-service platform that aggregates IT contract job listings
                  from publicly available sources across the United Kingdom. We provide tools to help IT
                  contractors discover, evaluate, and apply for contract roles.
                </p>
              </Section>

              <Section title="2. Eligibility">
                <p>
                  You must be at least 18 years old and legally permitted to work in the United Kingdom to
                  use this Platform. By using the Platform you confirm that you meet these requirements.
                </p>
              </Section>

              <Section title="3. Account Registration">
                <ul>
                  <li>You must provide accurate and complete information when creating an account.</li>
                  <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
                  <li>You are responsible for all activity that occurs under your account.</li>
                  <li>
                    You must notify us immediately at{" "}
                    <a href={`mailto:${COMPANY_EMAIL}`} className="text-primary hover:underline">{COMPANY_EMAIL}</a>{" "}
                    if you suspect any unauthorised use of your account.
                  </li>
                  <li>We reserve the right to suspend or terminate accounts that violate these Terms.</li>
                </ul>
              </Section>

              <Section title="4. Subscription Plans">
                <p>
                  ContractHub offers free and paid (Pro) subscription tiers.
                </p>
                <ul>
                  <li>
                    <strong>Free plan:</strong> Limited access to contract listings. Company names, locations,
                    and application links are not visible on the free plan.
                  </li>
                  <li>
                    <strong>Pro plan:</strong> Full access to all contract details, application links,
                    AI-assisted application tools, saved jobs, and email alerts. Billed monthly or annually
                    as stated at checkout.
                  </li>
                  <li>
                    Subscription fees are charged in advance. All prices are inclusive of VAT where applicable.
                  </li>
                  <li>
                    Subscriptions renew automatically on a recurring basis until cancelled.
                  </li>
                  <li>
                    <strong>Cancellation:</strong> You may cancel your Pro subscription at any time directly
                    from within the platform via your Account page. Upon cancellation, your subscription will
                    not renew and you will retain full Pro access until the end of your current paid billing
                    period. No partial-period refunds are issued.
                  </li>
                  <li>
                    We reserve the right to change pricing with reasonable notice. Existing subscribers will
                    be notified before any price change takes effect.
                  </li>
                </ul>
              </Section>

              <Section title="5. Refund Policy">
                <p>
                  ContractHub does not offer refunds on subscription payments. When you cancel your Pro plan:
                </p>
                <ul>
                  <li>Your subscription will not renew at the next billing date.</li>
                  <li>You will continue to have full Pro access until the end of your current billing period.</li>
                  <li>No refund will be issued for any unused portion of a billing period.</li>
                </ul>
                <p>
                  Exceptions apply only where required by applicable consumer protection law, including the
                  UK Consumer Contracts Regulations 2013. If you believe you are entitled to a statutory
                  refund, please contact us at{" "}
                  <a href={`mailto:${COMPANY_EMAIL}`} className="text-primary hover:underline">{COMPANY_EMAIL}</a>.
                </p>
              </Section>

              <Section title="6. Acceptable Use">
                <p>You agree not to:</p>
                <ul>
                  <li>Use the Platform for any unlawful purpose.</li>
                  <li>Scrape, copy, or redistribute contract listings or any data from the Platform without prior written consent.</li>
                  <li>Attempt to gain unauthorised access to any part of the Platform or its underlying systems.</li>
                  <li>Use automated tools, bots, or scripts to access or interact with the Platform.</li>
                  <li>Upload, post, or transmit any content that is harmful, fraudulent, or misleading.</li>
                  <li>Impersonate any person or entity or misrepresent your affiliation with any entity.</li>
                  <li>Interfere with or disrupt the integrity or performance of the Platform.</li>
                </ul>
              </Section>

              <Section title="7. Intellectual Property">
                <p>
                  All content, branding, software, and design elements of the Platform are owned by or
                  licensed to ContractHub and are protected by UK and international intellectual property
                  laws. You may not reproduce, distribute, or create derivative works from any part of the
                  Platform without our express written permission.
                </p>
                <p>
                  Contract listings aggregated on the Platform originate from third-party sources. We do not
                  claim ownership of those listings and they remain the property of their respective originators.
                </p>
              </Section>

              <Section title="8. Third-Party Content &amp; Links">
                <p>
                  The Platform may contain links to third-party websites or services (including job boards
                  and employer sites). We are not responsible for the content, accuracy, or practices of
                  any third-party sites. Accessing third-party links is at your own risk.
                </p>
              </Section>

              <Section title="9. AI Features">
                <p>
                  ContractHub offers AI-powered features including CV analysis, cover letter generation, and
                  application assistance ("Apply with AI"). These tools are provided as aids only. You are
                  solely responsible for reviewing and verifying any AI-generated content before submitting
                  it to a potential client or employer. ContractHub makes no warranties as to the accuracy,
                  suitability, or fitness of AI-generated outputs.
                </p>
              </Section>

              <Section title="10. Disclaimers">
                <p>
                  The Platform is provided on an "as is" and "as available" basis without warranties of any
                  kind. We do not guarantee that:
                </p>
                <ul>
                  <li>Contract listings are accurate, current, or complete.</li>
                  <li>Any listing will result in an interview, placement, or engagement.</li>
                  <li>The Platform will be uninterrupted, error-free, or secure at all times.</li>
                </ul>
                <p>
                  To the fullest extent permitted by law, ContractHub disclaims all implied warranties
                  including those of merchantability and fitness for a particular purpose.
                </p>
              </Section>

              <Section title="11. Limitation of Liability">
                <p>
                  To the maximum extent permitted by applicable law, ContractHub shall not be liable for any
                  indirect, incidental, special, consequential, or punitive damages, including but not limited
                  to loss of earnings, loss of contracts, or loss of data, arising from your use of or
                  inability to use the Platform.
                </p>
                <p>
                  Our total aggregate liability to you in connection with these Terms shall not exceed the
                  total fees paid by you to ContractHub in the twelve months preceding the claim.
                </p>
              </Section>

              <Section title="12. Privacy">
                <p>
                  Your use of the Platform is also governed by our Privacy Policy, which is incorporated into
                  these Terms by reference. By using the Platform you consent to the collection and use of
                  your data as described in our Privacy Policy.
                </p>
              </Section>

              <Section title="13. Changes to These Terms">
                <p>
                  We reserve the right to update these Terms at any time. We will notify registered users of
                  material changes by email or via a notice on the Platform. Your continued use of the
                  Platform after changes become effective constitutes your acceptance of the revised Terms.
                </p>
              </Section>

              <Section title="14. Governing Law">
                <p>
                  These Terms are governed by the laws of England and Wales. Any disputes arising from these
                  Terms or your use of the Platform shall be subject to the exclusive jurisdiction of the
                  courts of England and Wales.
                </p>
              </Section>

              <Section title="15. Contact Us">
                <p>
                  If you have any questions about these Terms, please contact us at:
                </p>
                <p>
                  <strong>{COMPANY_NAME}</strong><br />
                  <a href={`mailto:${COMPANY_EMAIL}`} className="text-primary hover:underline">{COMPANY_EMAIL}</a>
                </p>
              </Section>

            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-heading font-semibold text-base text-foreground mb-3">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
