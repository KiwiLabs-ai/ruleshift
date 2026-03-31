import { Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const BriefPreviewSection = () => {
  return (
    <section className="bg-muted py-24">
      <div className="container mx-auto px-4">
        <h2 className="text-center text-3xl font-bold text-foreground sm:text-4xl">
          See Exactly What You'll Get
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
          Every policy change is distilled into a structured, actionable brief. Here's a real example.
        </p>

        {/* Brief Card */}
        <div className="relative mx-auto mt-14 max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          {/* Header Bar */}
          <div className="flex items-center gap-3 border-b border-border bg-primary/5 px-6 py-4">
            <Shield className="h-5 w-5 text-secondary" />
            <h3 className="flex-1 text-base font-semibold text-card-foreground">
              Apple Updates In-App Purchase Requirements for Streaming Apps
            </h3>
            <Badge className="shrink-0 bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
              ⚠️ Important
            </Badge>
          </div>

          {/* Meta */}
          <div className="flex items-center gap-4 border-b border-border px-6 py-3 text-xs text-muted-foreground">
            <span>Apple App Review Guidelines</span>
            <span className="text-border">|</span>
            <span>March 1, 2026</span>
          </div>

          {/* Brief Content */}
          <div className="relative px-6 py-6">
            <div className="space-y-5">
              {/* What Changed */}
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-secondary">What Changed</h4>
                <p className="mt-1.5 text-sm leading-relaxed text-card-foreground">
                  Apple now requires all streaming apps to offer in-app purchase as a payment option alongside external links. Apps that previously relied solely on web-based subscriptions must integrate StoreKit 2 by the stated deadline or face removal from the App Store.
                </p>
              </div>

              {/* Who Is Affected */}
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-secondary">Who Is Affected</h4>
                <p className="mt-1.5 text-sm leading-relaxed text-card-foreground">
                  All iOS apps in the Entertainment, Music, and Video streaming categories distributing in the US and EU.
                </p>
              </div>

              {/* Required Actions */}
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-secondary">Required Actions</h4>
                <ol className="mt-1.5 list-inside list-decimal space-y-1 text-sm leading-relaxed text-card-foreground">
                  <li>Integrate StoreKit 2 in-app purchase flow for all subscription tiers</li>
                  <li>Update your app's entitlement server to validate App Store receipts</li>
                  <li>Submit updated binary for review at least 2 weeks before the deadline</li>
                </ol>
              </div>

              {/* Deadline */}
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-secondary">Deadline</h4>
                <p className="mt-1.5 text-sm font-bold text-destructive">
                  April 30, 2026 — Non-compliant apps will be removed from the App Store.
                </p>
              </div>
            </div>

            {/* Gradient overlay on bottom 40% */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-card via-card/90 to-transparent backdrop-blur-[2px]" />

            {/* CTA over the gradient */}
            <div className="absolute inset-x-0 bottom-6 z-10 flex justify-center">
              <Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-teal-light text-base px-8 shadow-lg" asChild>
                <Link to="/signup">Sign Up to Unlock Full Briefs</Link>
              </Button>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          RuleShift delivers briefs like this within hours of a policy change.
        </p>
      </div>
    </section>
  );
};

export default BriefPreviewSection;
