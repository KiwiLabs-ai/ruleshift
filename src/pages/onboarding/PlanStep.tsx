import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, Loader2, X, ArrowRight, Shield } from "lucide-react";
import OnboardingStepper from "@/components/onboarding/OnboardingStepper";
import { WelcomeBackBanner } from "@/components/onboarding/WelcomeBackBanner";
import { useOnboardingGuard } from "@/hooks/use-onboarding";
import { supabase } from "@/integrations/supabase/client";
import { apiCall } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { STRIPE_TIERS, TierKey } from "@/lib/stripe-tiers";
import { cn } from "@/lib/utils";

const FREE_FEATURES = [
  "Up to 5 monitored sources",
  "AI-powered impact briefs",
  "Email digest notifications",
  "1 team member",
  "Community support",
];

const PlanStep = () => {
  const { profile, loading, user } = useOnboardingGuard();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [showCanceledBanner, setShowCanceledBanner] = useState(
    searchParams.get("checkout") === "canceled"
  );
  const [skipping, setSkipping] = useState(false);

  // Guard: redirect back if they haven't reached step 4 yet
  if (!loading && profile && profile.onboarding_step < 4) {
    navigate("/onboarding/company", { replace: true });
    return null;
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  const handleSelectPlan = async (tierKey: TierKey) => {
    const tier = STRIPE_TIERS[tierKey];
    setCheckingOut(tierKey);

    const { data, error } = await apiCall("create-checkout", { priceId: tier.priceId });

    if (error || !data?.url) {
      toast({
        variant: "destructive",
        title: "Checkout error",
        description: error || "Could not create checkout session.",
      });
      setCheckingOut(null);
      return;
    }

    window.location.href = data.url;
  };

  const handleStartFree = async () => {
    setSkipping(true);
    const { error } = await supabase
      .from("profiles")
      .update({ onboarding_step: 5, onboarding_status: "complete" })
      .eq("user_id", user!.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not continue. Please try again.",
      });
      setSkipping(false);
      return;
    }
    navigate("/dashboard?welcome=free", { replace: true });
  };

  return (
    <div className="mx-auto max-w-4xl">
      <OnboardingStepper currentStep={4} />

      {showCanceledBanner && (
        <Alert className="mb-6 border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertDescription className="flex items-center justify-between">
            <span>
              Your checkout was not completed. Please select a plan to continue,
              or start with the Free plan.
            </span>
            <button
              onClick={() => setShowCanceledBanner(false)}
              className="ml-4 shrink-0 rounded p-1 hover:bg-amber-200/50 dark:hover:bg-amber-800/50"
            >
              <X className="h-4 w-4" />
            </button>
          </AlertDescription>
        </Alert>
      )}

      {!showCanceledBanner && searchParams.get("checkout") !== "canceled" && (
        <WelcomeBackBanner stepKey="4" />
      )}

      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">Choose your plan</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Start with a 14-day free trial on any paid plan, or explore with our Free tier.
        </p>
      </div>

      <div className="mt-10 grid gap-8 md:grid-cols-3">
        {(Object.keys(STRIPE_TIERS) as TierKey[]).map((key) => {
          const tier = STRIPE_TIERS[key];
          return (
            <Card
              key={key}
              className={cn(
                "relative flex flex-col transition-all hover:-translate-y-1",
                tier.highlighted
                  ? "border-secondary shadow-xl scale-[1.03] ring-2 ring-secondary/30"
                  : "shadow-md"
              )}
            >
              {tier.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-secondary px-4 py-1 text-xs font-semibold text-secondary-foreground">
                  Recommended
                </div>
              )}
              <CardHeader className="items-center pb-2">
                <CardTitle className="text-lg font-semibold text-card-foreground">
                  {tier.name}
                </CardTitle>
                <div className="mt-2">
                  <span className="text-4xl font-extrabold text-card-foreground">
                    {tier.price}
                  </span>
                  <span className="text-muted-foreground">/mo</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground text-center">
                  {tier.description}
                </p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between gap-6 pt-4">
                <ul className="space-y-3">
                  {tier.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-sm text-card-foreground"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className={cn(
                    "w-full",
                    tier.highlighted
                      ? "bg-secondary text-secondary-foreground hover:bg-teal-light"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                  disabled={checkingOut !== null || skipping}
                  onClick={() => handleSelectPlan(key)}
                >
                  {checkingOut === key ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                      Redirecting…
                    </>
                  ) : (
                    "Start Free Trial"
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Free plan CTA */}
      <div className="mt-10 mb-4">
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-sm">
          <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted">
                <Shield className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">Start with the Free Plan</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Monitor up to 5 sources with AI-powered briefs — no credit card required.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="lg"
              className="shrink-0 gap-2 min-w-[180px]"
              disabled={skipping || checkingOut !== null}
              onClick={handleStartFree}
            >
              {skipping ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Setting up…
                </>
              ) : (
                <>
                  Start Free <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          {FREE_FEATURES.map((f) => (
            <span key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Check className="h-3 w-3 text-secondary" />
              {f}
            </span>
          ))}
        </div>
      </div>

      <div className="text-center pb-4">
        <p className="text-sm text-muted-foreground">
          14-day free trial on all paid plans. You won't be charged until the trial ends.
        </p>
      </div>
    </div>
  );
};

export default PlanStep;
