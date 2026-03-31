import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Logo from "@/components/Logo";

const sections = [
  { id: "info-collect", label: "Information We Collect" },
  { id: "how-use", label: "How We Use Your Data" },
  { id: "ai-processing", label: "AI Processing Disclosure" },
  { id: "third-party", label: "Third-Party Services" },
  { id: "data-retention", label: "Data Retention" },
  { id: "your-rights", label: "Your Rights" },
  { id: "cookies", label: "Cookies & Storage" },
  { id: "gdpr", label: "GDPR Compliance" },
  { id: "ccpa", label: "CCPA Compliance" },
  { id: "children", label: "Children's Privacy" },
  { id: "changes", label: "Changes to This Policy" },
  { id: "contact", label: "Contact Us" },
];

const PrivacyPolicy = () => {
  return (
    <div className="relative min-h-screen gradient-mesh">
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-glow-teal/10 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-navy-dark/40 blur-3xl rounded-full pointer-events-none" />

      {/* Sticky header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-card/60 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-card-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <Logo size="sm" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-3xl rounded-3xl bg-card/80 backdrop-blur-sm ring-1 ring-white/5 p-8 md:p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 auth-dots pointer-events-none" />

          <div className="relative z-10">
            <h1 className="text-3xl font-bold text-card-foreground">Privacy Policy</h1>
            <p className="mt-2 text-sm text-muted-foreground">Last updated: March 25, 2026</p>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              RuleShift ("we", "our", or "us") operates a regulatory monitoring SaaS platform. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service.
            </p>

            {/* Table of contents */}
            <nav className="mt-8 rounded-xl bg-muted/30 p-5 ring-1 ring-white/5">
              <h2 className="text-sm font-semibold text-card-foreground mb-3">Table of Contents</h2>
              <ol className="grid gap-1.5 sm:grid-cols-2 text-sm">
                {sections.map((s, i) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} className="text-secondary hover:underline">
                      {i + 1}. {s.label}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            <div className="mt-10 space-y-10 text-sm text-muted-foreground leading-relaxed">
              <section id="info-collect">
                <h2 className="text-lg font-semibold text-card-foreground mb-3">1. Information We Collect</h2>
                <p className="mb-2">We collect the following categories of information:</p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li><strong className="text-card-foreground">Account information:</strong> Full name, email address, and password when you create an account.</li>
                  <li><strong className="text-card-foreground">Company details:</strong> Company name, industry, company size, and compliance concerns provided during onboarding.</li>
                  <li><strong className="text-card-foreground">Monitoring preferences:</strong> Selected regulatory sources, notification settings, digest frequency, and severity thresholds.</li>
                  <li><strong className="text-card-foreground">Usage data:</strong> Pages visited, features used, alerts viewed, briefs read, and general interaction patterns with the platform.</li>
                  <li><strong className="text-card-foreground">Payment information:</strong> Billing details processed securely by Stripe — we do not store credit card numbers on our servers.</li>
                  <li><strong className="text-card-foreground">Team data:</strong> Email addresses of team members you invite to your organization.</li>
                </ul>
              </section>

              <section id="how-use">
                <h2 className="text-lg font-semibold text-card-foreground mb-3">2. How We Use Your Data</h2>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>To provide and maintain the regulatory monitoring service, including scanning policy sources for changes.</li>
                  <li>To generate AI-powered impact briefs that summarize and contextualize regulatory changes for your business.</li>
                  <li>To send alerts, notifications, and digests via email and Slack based on your preferences.</li>
                  <li>To personalize your experience by recommending relevant sources and templates based on your industry.</li>
                  <li>To process subscription payments and manage your billing account.</li>
                  <li>To improve and optimize the platform through aggregated, anonymized usage analytics.</li>
                  <li>To communicate service updates, security notices, and product announcements.</li>
                </ul>
              </section>

              <section id="ai-processing">
                <h2 className="text-lg font-semibold text-card-foreground mb-3">3. AI Processing Disclosure</h2>
                <p className="mb-2">
                  RuleShift uses artificial intelligence to analyze detected policy changes and generate structured impact briefs. When a monitored regulatory source changes:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>The text content of the changed page is captured and compared against the previous snapshot.</li>
                  <li>The diff (changed content) is sent to an AI language model to produce a human-readable impact summary.</li>
                  <li>AI-generated briefs are informational summaries — they are <strong className="text-card-foreground">not legal advice</strong>.</li>
                  <li>We use third-party AI providers (see Section 4) to process this data. Your company name and industry may be included in the AI prompt for contextualization.</li>
                  <li>We do not use your data to train AI models.</li>
                </ul>
              </section>

              <section id="third-party">
                <h2 className="text-lg font-semibold text-card-foreground mb-3">4. Third-Party Services</h2>
                <p className="mb-2">We rely on trusted third-party services to operate the platform:</p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li><strong className="text-card-foreground">Supabase:</strong> Cloud database, authentication, and serverless functions hosting.</li>
                  <li><strong className="text-card-foreground">Stripe:</strong> Payment processing and subscription management. Subject to <a href="https://stripe.com/privacy" className="text-secondary hover:underline" target="_blank" rel="noopener noreferrer">Stripe's Privacy Policy</a>.</li>
                  <li><strong className="text-card-foreground">Resend:</strong> Transactional email delivery for alerts and digests.</li>
                  <li><strong className="text-card-foreground">AI Providers:</strong> Language model APIs (e.g., Google Gemini, OpenAI) for generating impact briefs from regulatory change data.</li>
                </ul>
              </section>

              <section id="data-retention">
                <h2 className="text-lg font-semibold text-card-foreground mb-3">5. Data Retention</h2>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li><strong className="text-card-foreground">Page snapshots:</strong> Retained for 90 days from capture date, then automatically purged.</li>
                  <li><strong className="text-card-foreground">Generated briefs and alerts:</strong> Retained while your subscription is active and for 30 days after cancellation.</li>
                  <li><strong className="text-card-foreground">Account data:</strong> Retained while your subscription is active. Upon account deletion, personal data is removed within 30 days.</li>
                  <li><strong className="text-card-foreground">Audit logs:</strong> Retained for 1 year for security and compliance purposes.</li>
                  <li><strong className="text-card-foreground">Payment records:</strong> Retained as required by applicable tax and financial regulations.</li>
                </ul>
              </section>

              <section id="your-rights">
                <h2 className="text-lg font-semibold text-card-foreground mb-3">6. Your Rights</h2>
                <p className="mb-2">Depending on your jurisdiction, you may have the right to:</p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li><strong className="text-card-foreground">Access:</strong> Request a copy of the personal data we hold about you.</li>
                  <li><strong className="text-card-foreground">Correction:</strong> Request correction of inaccurate or incomplete personal data.</li>
                  <li><strong className="text-card-foreground">Deletion:</strong> Request deletion of your personal data, subject to legal retention requirements.</li>
                  <li><strong className="text-card-foreground">Data export:</strong> Request a portable copy of your data in a machine-readable format.</li>
                  <li><strong className="text-card-foreground">Restriction:</strong> Request that we limit the processing of your data in certain circumstances.</li>
                  <li><strong className="text-card-foreground">Objection:</strong> Object to processing of your personal data for specific purposes.</li>
                </ul>
                <p className="mt-2">To exercise any of these rights, contact us at <a href="mailto:support@ruleshift.app" className="text-secondary hover:underline">support@ruleshift.app</a>. We will respond within 30 days.</p>
              </section>

              <section id="cookies">
                <h2 className="text-lg font-semibold text-card-foreground mb-3">7. Cookies & Storage</h2>
                <p className="mb-2">RuleShift uses minimal cookies and browser storage:</p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li><strong className="text-card-foreground">Authentication cookies:</strong> Essential cookies to maintain your login session. These are strictly necessary and cannot be disabled.</li>
                  <li><strong className="text-card-foreground">Session storage:</strong> Temporary data stored in your browser to support the application interface, cleared when you close the tab.</li>
                  <li><strong className="text-card-foreground">Local storage:</strong> Preferences such as sidebar state and theme settings stored locally on your device.</li>
                </ul>
                <p className="mt-2">We do not use advertising cookies, tracking pixels, or third-party analytics cookies.</p>
              </section>

              <section id="gdpr">
                <h2 className="text-lg font-semibold text-card-foreground mb-3">8. GDPR Compliance (EEA Users)</h2>
                <p className="mb-2">If you are located in the European Economic Area, the following applies:</p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li><strong className="text-card-foreground">Legal basis:</strong> We process your data based on contractual necessity (to provide the service), legitimate interest (to improve the platform), and consent (where required).</li>
                  <li><strong className="text-card-foreground">Data transfers:</strong> Your data may be transferred to and processed in the United States. We ensure appropriate safeguards are in place, including Standard Contractual Clauses.</li>
                  <li><strong className="text-card-foreground">Data Protection Officer:</strong> For GDPR inquiries, contact <a href="mailto:support@ruleshift.app" className="text-secondary hover:underline">support@ruleshift.app</a>.</li>
                  <li><strong className="text-card-foreground">Supervisory authority:</strong> You have the right to lodge a complaint with your local data protection authority.</li>
                </ul>
              </section>

              <section id="ccpa">
                <h2 className="text-lg font-semibold text-card-foreground mb-3">9. CCPA Compliance (California Residents)</h2>
                <p className="mb-2">If you are a California resident, under the California Consumer Privacy Act (CCPA/CPRA) you have the right to:</p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Know what personal information we collect and how it is used.</li>
                  <li>Request deletion of your personal information.</li>
                  <li>Opt out of the sale or sharing of your personal information. <strong className="text-card-foreground">We do not sell or share your personal information.</strong></li>
                  <li>Non-discrimination for exercising your privacy rights.</li>
                </ul>
                <p className="mt-2">To make a CCPA request, email <a href="mailto:support@ruleshift.app" className="text-secondary hover:underline">support@ruleshift.app</a> with the subject "CCPA Request".</p>
              </section>

              <section id="children">
                <h2 className="text-lg font-semibold text-card-foreground mb-3">10. Children's Privacy</h2>
                <p>RuleShift is a business-to-business service not intended for individuals under the age of 18. We do not knowingly collect personal information from children.</p>
              </section>

              <section id="changes">
                <h2 className="text-lg font-semibold text-card-foreground mb-3">11. Changes to This Policy</h2>
                <p>We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date. Continued use of the service after changes constitutes acceptance of the revised policy.</p>
              </section>

              <section id="contact">
                <h2 className="text-lg font-semibold text-card-foreground mb-3">12. Contact Us</h2>
                <p>
                  If you have any questions about this Privacy Policy, please contact us at:{" "}
                  <a href="mailto:support@ruleshift.app" className="text-secondary hover:underline">support@ruleshift.app</a>
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
