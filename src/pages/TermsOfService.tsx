import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Logo from "@/components/Logo";

const sections = [
  { id: "service", label: "Service Description" },
  { id: "accounts", label: "Account Registration" },
  { id: "billing", label: "Subscription & Billing" },
  { id: "acceptable-use", label: "Acceptable Use" },
  { id: "ip", label: "Intellectual Property" },
  { id: "disclaimer", label: "Disclaimer — Not Legal Advice" },
  { id: "liability", label: "Limitation of Liability" },
  { id: "indemnification", label: "Indemnification" },
  { id: "termination", label: "Termination" },
  { id: "governing-law", label: "Governing Law" },
  { id: "changes", label: "Changes to Terms" },
  { id: "contact", label: "Contact Us" },
];

const TermsOfService = () => {
  return (
    <div className="relative min-h-screen gradient-mesh">
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-glow-teal/10 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-navy-dark/40 blur-3xl rounded-full pointer-events-none" />

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
            <h1 className="text-3xl font-bold text-card-foreground">Terms of Service</h1>
            <p className="mt-2 text-sm text-muted-foreground">Last updated: March 25, 2026</p>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              These Terms of Service ("Terms") govern your access to and use of RuleShift ("we", "our", or "us"), a regulatory monitoring SaaS platform. By creating an account or using the service, you agree to be bound by these Terms.
            </p>

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
              <section id="service">
                <h2 className="text-lg font-semibold text-card-foreground mb-3">1. Service Description</h2>
                <p className="mb-2">RuleShift provides:</p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li><strong className="text-card-foreground">Automated regulatory monitoring:</strong> Periodic scanning of government, regulatory, and platform policy web pages to detect content changes.</li>
                  <li><strong className="text-card-foreground">AI-generated impact briefs:</strong> When a change is detected, our AI system produces a structured summary explaining what changed and its potential impact on your business.</li>
                  <li><strong className="text-card-foreground">Notification delivery:</strong> Alerts and digest summaries sent via email based on your configured preferences.</li>
                  <li><strong className="text-card-foreground">Archive and search:</strong> Historical access to previously generated briefs and alerts for your organization.</li>
                </ul>
              </section>

              <section id="accounts">
                <h2 className="text-lg font-semibold text-card-foreground mb-3">2. Account Registration & Eligibility</h2>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>You must be at least 18 years old and have the legal authority to enter into these Terms on behalf of yourself or your organization.</li>
                  <li>You must provide accurate and complete registration information and keep it up to date.</li>
                  <li>You are responsible for maintaining the security of your account credentials and for all activity under your account.</li>
                  <li>One person or organization may not maintain more than one free trial account.</li>
                  <li>You must promptly notify us at <a href="mailto:support@ruleshift.app" className="text-secondary hover:underline">support@ruleshift.app</a> if you suspect unauthorized access to your account.</li>
                </ul>
              </section>

              <section id="billing">
                <h2 className="text-lg font-semibold text-card-foreground mb-3">3. Subscription Plans & Billing</h2>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li><strong className="text-card-foreground">Free trial:</strong> New accounts receive a 14-day free trial. At the end of the trial, you must select a paid plan to continue using the service.</li>
                  <li><strong className="text-card-foreground">Paid plans:</strong> RuleShift offers Starter ($49/month), Professional ($99/month), and Enterprise ($199/month) plans with varying source limits and features.</li>
                  <li><strong className="text-card-foreground">Payment processing:</strong> All payments are processed securely by Stripe. By subscribing, you agree to Stripe's terms of service.</li>
                  <li><strong className="text-card-foreground">Auto-renewal:</strong> Subscriptions automatically renew at the end of each billing period unless cancelled.</li>
                  <li><strong className="text-card-foreground">Cancellation:</strong> You may cancel your subscription at any time through the Settings page. Cancellation takes effect at the end of the current billing period — no prorated refunds are provided.</li>
                  <li><strong className="text-card-foreground">Price changes:</strong> We may modify pricing with 30 days' prior notice. Continued use after a price change constitutes acceptance.</li>
                </ul>
              </section>

              <section id="acceptable-use">
                <h2 className="text-lg font-semibold text-card-foreground mb-3">4. Acceptable Use</h2>
                <p className="mb-2">You agree NOT to:</p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Use automated tools, bots, or scripts to scrape, crawl, or extract data from the RuleShift platform.</li>
                  <li>Resell, redistribute, or commercially republish AI-generated briefs or alert data to third parties.</li>
                  <li>Circumvent plan limits, source caps, or usage restrictions through any technical means.</li>
                  <li>Attempt to reverse-engineer, decompile, or extract source code from the platform.</li>
                  <li>Use the service for any illegal purpose or in violation of applicable laws.</li>
                  <li>Share account credentials with individuals outside your organization.</li>
                  <li>Interfere with or disrupt the integrity or performance of the service.</li>
                </ul>
              </section>

              <section id="ip">
                <h2 className="text-lg font-semibold text-card-foreground mb-3">5. Intellectual Property</h2>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>The RuleShift platform, including its design, code, branding, and documentation, is owned by RuleShift and protected by intellectual property laws.</li>
                  <li>AI-generated briefs are provided to you under a limited, non-exclusive license for your internal business use only.</li>
                  <li>Regulatory source content belongs to the respective government agencies and regulatory bodies — RuleShift monitors publicly available pages and does not claim ownership of source content.</li>
                  <li>Your organization's data (company information, preferences, team data) remains your property.</li>
                </ul>
              </section>

              <section id="disclaimer">
                <h2 className="text-lg font-semibold text-card-foreground mb-3">6. Disclaimer — Not Legal Advice</h2>
                <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4">
                  <p className="font-semibold text-card-foreground mb-2">⚠️ Important Disclaimer</p>
                  <p>
                    RuleShift is <strong className="text-card-foreground">NOT a substitute for professional legal counsel</strong>. AI-generated briefs are automated summaries of detected changes to publicly available regulatory pages. They are provided for informational purposes only and do not constitute legal advice, legal opinions, or recommendations.
                  </p>
                  <p className="mt-2">
                    You should always consult with qualified legal professionals before making business decisions based on regulatory changes. RuleShift makes no representations or warranties regarding the accuracy, completeness, or timeliness of AI-generated content.
                  </p>
                  <p className="mt-2">
                    RuleShift does not guarantee that all relevant regulatory changes will be detected. Source monitoring depends on the availability and structure of third-party websites, which may change without notice.
                  </p>
                </div>
              </section>

              <section id="liability">
                <h2 className="text-lg font-semibold text-card-foreground mb-3">7. Limitation of Liability</h2>
                <p className="mb-2">TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:</p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>RuleShift shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, business opportunities, or goodwill.</li>
                  <li>Our total aggregate liability for any claims arising from your use of the service shall not exceed the amounts paid by you to RuleShift in the twelve (12) months preceding the claim.</li>
                  <li>We are not liable for any losses resulting from reliance on AI-generated briefs, missed regulatory changes, delayed notifications, or service interruptions.</li>
                  <li>The service is provided "AS IS" and "AS AVAILABLE" without warranties of any kind, express or implied, including merchantability, fitness for a particular purpose, and non-infringement.</li>
                </ul>
              </section>

              <section id="indemnification">
                <h2 className="text-lg font-semibold text-card-foreground mb-3">8. Indemnification</h2>
                <p>
                  You agree to indemnify, defend, and hold harmless RuleShift, its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including attorneys' fees) arising from your use of the service, violation of these Terms, or infringement of any third-party rights.
                </p>
              </section>

              <section id="termination">
                <h2 className="text-lg font-semibold text-card-foreground mb-3">9. Termination</h2>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li><strong className="text-card-foreground">By you:</strong> You may cancel your subscription and delete your account at any time through the Settings page.</li>
                  <li><strong className="text-card-foreground">By us:</strong> We may suspend or terminate your account if you violate these Terms, engage in abusive behavior, or fail to pay subscription fees after reasonable notice.</li>
                  <li><strong className="text-card-foreground">Effect of termination:</strong> Upon termination, your access to the platform and all generated briefs will cease. We will retain your data for 30 days post-termination, after which it will be permanently deleted.</li>
                  <li><strong className="text-card-foreground">Survival:</strong> Sections on Intellectual Property, Disclaimer, Limitation of Liability, Indemnification, and Governing Law survive termination.</li>
                </ul>
              </section>

              <section id="governing-law">
                <h2 className="text-lg font-semibold text-card-foreground mb-3">10. Governing Law</h2>
                <p>
                  These Terms shall be governed by and construed in accordance with the laws of the State of [__________], without regard to its conflict of law provisions. Any disputes arising under these Terms shall be resolved exclusively in the state or federal courts located in [__________].
                </p>
              </section>

              <section id="changes">
                <h2 className="text-lg font-semibold text-card-foreground mb-3">11. Changes to These Terms</h2>
                <p>
                  We reserve the right to modify these Terms at any time. We will provide at least 30 days' notice of material changes by posting the updated Terms on this page and, where possible, notifying you via email. Your continued use of the service after the effective date of revised Terms constitutes acceptance.
                </p>
              </section>

              <section id="contact">
                <h2 className="text-lg font-semibold text-card-foreground mb-3">12. Contact Us</h2>
                <p>
                  If you have any questions about these Terms of Service, please contact us at:{" "}
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

export default TermsOfService;
