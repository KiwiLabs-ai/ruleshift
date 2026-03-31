import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Radar,
  FileText,
  Mail,
  ArrowRight,
} from "lucide-react";
import { STRIPE_TIERS, TierKey } from "@/lib/stripe-tiers";

const SESSION_KEY = "ruleshift_welcome_shown";

interface WelcomeModalProps {
  orgId: string;
  onDismiss: () => void;
}

export function WelcomeModal({ orgId, onDismiss }: WelcomeModalProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(true);
  const scanFired = useRef(false);

  // Fire-and-forget first scan
  useEffect(() => {
    if (scanFired.current || !orgId) return;
    scanFired.current = true;
    supabase.functions
      .invoke("monitor-sources", { body: { org_id: orgId } })
      .catch((err) => console.warn("[WelcomeModal] monitor-sources fire-and-forget error:", err));
    supabase.functions
      .invoke("seed-sample-data", { body: { organization_id: orgId, user_id: user?.id } })
      .catch((err) => console.warn("[WelcomeModal] seed-sample-data fire-and-forget error:", err));
  }, [orgId]);

  // Mark shown in sessionStorage
  useEffect(() => {
    sessionStorage.setItem(SESSION_KEY, "true");
  }, []);

  // Subscription info
  const { data: subData } = useQuery({
    queryKey: ["welcome-subscription", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("product_id, status")
        .eq("organization_id", orgId)
        .single();
      if (error) return null;
      return data;
    },
    staleTime: Infinity,
  });

  // Source count
  const { data: sourceCount } = useQuery({
    queryKey: ["welcome-source-count", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("organization_sources")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId);
      if (error) return 0;
      return count ?? 0;
    },
    staleTime: Infinity,
  });

  // Notification prefs
  const { data: notifPrefs } = useQuery({
    queryKey: ["welcome-notif-prefs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("email_enabled, slack_enabled, digest_frequency")
        .eq("user_id", user!.id)
        .single();
      if (error) return null;
      return data;
    },
    staleTime: Infinity,
  });

  // Resolve plan name
  const planName = (() => {
    if (!subData?.product_id) return "Free";
    const tier = (Object.keys(STRIPE_TIERS) as TierKey[]).find(
      (k) => STRIPE_TIERS[k].productId === subData.product_id
    );
    return tier ? STRIPE_TIERS[tier].name : "Free";
  })();

  const notifChannel = notifPrefs?.slack_enabled
    ? "Email + Slack"
    : notifPrefs?.email_enabled
    ? "Email"
    : "Email";

  const digestLabel =
    notifPrefs?.digest_frequency === "realtime"
      ? "real-time"
      : notifPrefs?.digest_frequency ?? "daily";

  const handleDismiss = () => {
    setOpen(false);
    onDismiss();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleDismiss()}>
      <DialogContent className="sm:max-w-lg border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl p-0 gap-0 overflow-hidden">
        {/* Celebration header */}
        <div className="relative px-8 pt-10 pb-6 text-center overflow-hidden">
          {/* Gradient glow behind icon */}
          <div className="absolute inset-0 bg-gradient-to-b from-secondary/10 via-secondary/5 to-transparent pointer-events-none" />

          <div className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-secondary/15 ring-4 ring-secondary/10">
            <CheckCircle2 className="h-10 w-10 text-secondary animate-in zoom-in-50 duration-500" />
          </div>

          <DialogTitle className="text-2xl font-bold font-display text-foreground">
            Welcome to RuleShift!
          </DialogTitle>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Your <span className="font-semibold text-secondary">{planName}</span> plan is active. Here's what happens next.
          </p>
        </div>

        {/* Steps */}
        <div className="px-8 pb-2 space-y-1">
          {/* Step 1 */}
          <div className="flex gap-4 rounded-xl p-4 bg-surface-elevated/50 dark:bg-surface-elevated/30">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary/10">
              <Radar className="h-5 w-5 text-secondary animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                We're running your first scan now
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Capturing baselines across{" "}
                <span className="font-medium text-foreground">
                  {sourceCount ?? "your"} {sourceCount === 1 ? "source" : "sources"}
                </span>
                . We'll compare future changes against these snapshots.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4 rounded-xl p-4 bg-surface-elevated/50 dark:bg-surface-elevated/30">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary/10">
              <FileText className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                You'll get your first brief within hours
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Our AI will analyze detected changes and create a plain-language
                impact brief with recommended actions.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-4 rounded-xl p-4 bg-surface-elevated/50 dark:bg-surface-elevated/30">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary/10">
              <Mail className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Check your inbox
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                You'll receive {digestLabel} digests via{" "}
                <span className="font-medium text-foreground">{notifChannel}</span>.
                You can adjust this anytime in Settings.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="px-8 pb-8 pt-4">
          <Button
            onClick={handleDismiss}
            className="w-full bg-secondary text-secondary-foreground hover:bg-teal-light gap-2 font-semibold"
            size="lg"
          >
            Go to Dashboard
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function shouldShowWelcomeModal(searchParams: URLSearchParams): boolean {
  return (
    searchParams.get("checkout") === "success" &&
    sessionStorage.getItem(SESSION_KEY) !== "true"
  );
}
