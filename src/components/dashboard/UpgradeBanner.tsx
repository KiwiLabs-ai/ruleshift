import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, ArrowRight, X, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const DISMISS_KEY = "ruleshift_upgrade_dismissed_at";

export function UpgradeBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(() => {
    const ts = localStorage.getItem(DISMISS_KEY);
    if (!ts) return false;
    const diff = Date.now() - parseInt(ts, 10);
    return diff < 7 * 24 * 60 * 60 * 1000;
  });

  const { data: subInfo, isLoading } = useQuery({
    queryKey: ["has-active-subscription", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (!profile?.organization_id) return { status: "none" as const, currentPeriodEnd: null };

      const { data: sub } = await supabase
        .from("subscriptions")
        .select("status, current_period_end")
        .eq("organization_id", profile.organization_id)
        .maybeSingle();

      return {
        status: (sub?.status ?? "none") as string,
        currentPeriodEnd: sub?.current_period_end ?? null,
      };
    },
    staleTime: 60_000,
  });

  if (isLoading) return null;

  const status = subInfo?.status ?? "none";
  const isTrialing = status === "trialing";
  const isActive = status === "active";
  const trialDaysLeft = isTrialing && subInfo?.currentPeriodEnd
    ? Math.max(0, Math.ceil((new Date(subInfo.currentPeriodEnd).getTime() - Date.now()) / 86_400_000))
    : null;

  // Active subscribers — no banner
  if (isActive) return null;

  // Free users — show upgrade banner (dismissable)
  if (!isTrialing) {
    if (dismissed) return null;

    return (
      <div className="relative overflow-hidden rounded-xl border border-secondary/20 bg-gradient-to-r from-secondary/5 via-secondary/10 to-secondary/5 backdrop-blur-sm px-5 py-4 flex items-center justify-between gap-4">
        <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-secondary/10 blur-2xl pointer-events-none" />
        <div className="flex items-center gap-3 relative">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/15">
            <Sparkles className="h-4.5 w-4.5 text-secondary" />
          </div>
          <p className="text-sm text-foreground">
            You're on the Free plan —{" "}
            <span className="text-muted-foreground">
              upgrade to unlock more sources, team seats, and full monitoring features.
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 relative shrink-0">
          <Link
            to="/settings?tab=billing"
            className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground hover:bg-teal-light transition-colors shadow-sm"
          >
            Upgrade Now
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <button
            onClick={() => {
              localStorage.setItem(DISMISS_KEY, String(Date.now()));
              setDismissed(true);
            }}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // Trial users — show trial countdown (not dismissable)
  const urgent = trialDaysLeft !== null && trialDaysLeft <= 3;
  const borderColor = urgent ? "border-amber-500/30" : "border-secondary/20";
  const bgGradient = urgent
    ? "from-amber-500/5 via-amber-500/10 to-amber-500/5"
    : "from-secondary/5 via-secondary/10 to-secondary/5";
  const iconBg = urgent ? "bg-amber-500/15" : "bg-secondary/15";
  const iconColor = urgent ? "text-amber-500" : "text-secondary";

  return (
    <div className={`relative overflow-hidden rounded-xl border ${borderColor} bg-gradient-to-r ${bgGradient} backdrop-blur-sm px-5 py-4 flex items-center justify-between gap-4`}>
      <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-secondary/10 blur-2xl pointer-events-none" />
      <div className="flex items-center gap-3 relative">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
          <Clock className={`h-4.5 w-4.5 ${iconColor}`} />
        </div>
        <p className="text-sm text-foreground">
          {trialDaysLeft === 0
            ? "Your free trial ends today — "
            : trialDaysLeft === 1
              ? "Your free trial ends tomorrow — "
              : `${trialDaysLeft} days left in your free trial — `}
          <span className="text-muted-foreground">
            subscribe now to keep your sources, briefs, and monitoring active.
          </span>
        </p>
      </div>
      <div className="flex items-center gap-2 relative shrink-0">
        <Link
          to="/settings?tab=billing"
          className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground hover:bg-teal-light transition-colors shadow-sm"
        >
          Subscribe Now
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
