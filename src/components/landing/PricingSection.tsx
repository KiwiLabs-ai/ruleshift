import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const tiers = [
  {
    name: "Basic",
    monthlyPrice: 49,
    annualPrice: 39,
    description: "For small teams getting started with compliance monitoring.",
    features: [
      "Up to 10 policy sources",
      "Weekly email digest",
      "Email alerts",
      "30-day brief archive",
      "Single user",
    ],
    highlighted: false,
    cta: "Start Free Trial",
  },
  {
    name: "Professional",
    monthlyPrice: 99,
    annualPrice: 79,
    description: "For growing businesses that need daily coverage.",
    features: [
      "Up to 25 policy sources",
      "Daily digest",
      "Impact briefs with action items",
      "Full brief archive",
      "Up to 5 users",
    ],
    highlighted: true,
    cta: "Start Free Trial — Most Popular",
  },
  {
    name: "Enterprise",
    monthlyPrice: 199,
    annualPrice: 159,
    description: "For organizations requiring real-time coverage and analyst review.",
    features: [
      "Unlimited policy sources",
      "Real-time alerts",
      "Analyst-reviewed briefs",
      "Custom SLAs",
      "Unlimited users",
      "Dedicated account manager",
      "API access",
    ],
    highlighted: false,
    cta: "Contact Sales",
  },
];

const PricingSection = () => {
  const [annual, setAnnual] = useState(false);

  return (
    <section
      id="pricing"
      className="py-24"
      style={{
        background:
          "radial-gradient(ellipse at center, hsl(var(--muted)) 0%, hsl(var(--background)) 70%)",
      }}
    >
      <div className="container mx-auto px-4">
        <h2 className="text-center text-3xl font-bold text-foreground sm:text-4xl">
          Simple, Transparent Pricing
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
          Choose the plan that fits your compliance needs.
        </p>

        {/* Billing Toggle */}
        <div className="mt-8 flex items-center justify-center gap-1 rounded-full border border-border bg-card p-1 w-fit mx-auto">
          <button
            onClick={() => setAnnual(false)}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-medium transition-colors",
              !annual
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-medium transition-colors",
              annual
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Annual
          </button>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {tiers.map((t) => (
            <Card
              key={t.name}
              className={cn(
                "relative flex flex-col transition-all duration-300",
                t.highlighted
                  ? "scale-[1.03] ring-2 ring-secondary/40 shadow-[0_0_40px_rgba(42,161,152,0.12)] hover:shadow-[0_0_56px_rgba(42,161,152,0.2)] hover:-translate-y-1"
                  : "border-border shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] shadow-md hover:shadow-xl hover:-translate-y-0.5"
              )}
              style={
                t.highlighted
                  ? {
                      background:
                        "linear-gradient(180deg, hsl(var(--card)) 0%, hsl(175 47% 40% / 0.03) 100%)",
                    }
                  : undefined
              }
            >
              {t.highlighted && (
                <div className="pricing-badge absolute -top-4 left-1/2 -translate-x-1/2 overflow-hidden rounded-full px-4 py-1 text-xs font-semibold text-primary-foreground"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--secondary)), hsl(var(--glow-teal)))",
                    textShadow: "0 1px 2px rgba(0,0,0,0.2)",
                  }}
                >
                  <span className="relative z-10">✦ Most Popular</span>
                </div>
              )}
              <CardHeader className="items-center pb-2">
                <CardTitle className="text-lg font-semibold text-card-foreground">
                  {t.name}
                </CardTitle>
                <div className="mt-2 flex items-baseline gap-2">
                  <span
                    className={cn(
                      "text-5xl font-extrabold",
                      t.highlighted ? "text-gradient" : "text-card-foreground"
                    )}
                  >
                    ${annual ? t.annualPrice : t.monthlyPrice}
                  </span>
                  <span className="text-base text-muted-foreground">/mo</span>
                  {annual && (
                    <>
                      <span className="text-sm text-muted-foreground line-through">
                        ${t.monthlyPrice}
                      </span>
                      <Badge
                        variant="secondary"
                        className="bg-secondary/10 text-secondary text-[10px] px-1.5 py-0"
                      >
                        Save 20%
                      </Badge>
                    </>
                  )}
                </div>
                <p className="mt-2 text-sm text-muted-foreground text-center">
                  {t.description}
                </p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between gap-6 pt-4">
                <ul className="space-y-3">
                  {t.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2.5 text-sm text-card-foreground"
                    >
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-secondary/10">
                        <Check className="h-3 w-3 text-secondary" />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <div>
                  <div className="mb-4 border-t border-dashed border-border/50" />
                  <Button
                    className={cn(
                      "w-full",
                      t.highlighted
                        ? "bg-secondary text-secondary-foreground hover:bg-teal-light"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                    asChild
                  >
                    <Link to="/signup">{t.cta}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trust Block */}
        <div className="mt-10 space-y-2 text-center">
          <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4 text-secondary" />
            14-day free trial on all plans. Credit card required. Cancel anytime before your trial ends.
          </p>
          <p className="pt-1 text-xs text-muted-foreground/70">
            Prices in USD. Cancel anytime.
          </p>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
