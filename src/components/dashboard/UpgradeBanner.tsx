import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, ArrowRight, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const DISMISS_KEY = "ruleshift_upgrade_dismissed_at";

export function UpgradeBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(() => {
    const ts = localStorage.getItem(DISMISS_KEY);
    if (!ts) return false;
    // Re-show after 7 days
    const diff = Date.now() - parseInt(ts, 10);
    return diff < 7 * 24 * 60 * 60 * 1000;
  });

  const { data: hasSubscription, isLoading } = useQuery({
    queryKey: ["has-active-subscription", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user!.id)
        .single();

      if (!profile?.organization_id) return false;

      const { data: sub } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("organization_id", profile.organization_id)
        .single();

      return sub && ["active", "trialing"].includes(sub.status);
    },
    staleTime: 60_000,
  });

  if (isLoading || hasSubscription || dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-secondary/20 bg-gradient-to-r from-secondary/5 via-secondary/10 to-secondary/5 backdrop-blur-sm px-5 py-4 flex items-center justify-between gap-4">
      {/* Subtle glow */}
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
          onClick={handleDismiss}
          className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
