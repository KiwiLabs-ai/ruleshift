import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubscriptionStatus } from "@/hooks/use-settings-data";
import { useOrganizationId } from "@/hooks/use-dashboard-data";
import { useActiveSources, useBriefsThisMonth } from "@/hooks/use-dashboard-data";
import { STRIPE_TIERS, TierKey } from "@/lib/stripe-tiers";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, ExternalLink, ArrowUpRight } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function BillingTab() {
  const { toast } = useToast();
  const { data: sub, isLoading: subLoading } = useSubscriptionStatus();
  const { data: orgId } = useOrganizationId();
  const { data: sources } = useActiveSources(orgId);
  const { data: briefsCount } = useBriefsThisMonth(orgId);

  // Determine current tier
  const currentTier = Object.entries(STRIPE_TIERS).find(
    ([, t]) => t.productId === sub?.product_id || t.priceId === sub?.price_id
  );
  const tierKey = currentTier?.[0] as TierKey | undefined;
  const tierInfo = tierKey ? STRIPE_TIERS[tierKey] : null;

  const handleManageBilling = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch {
      toast({ title: "Unable to open billing portal", variant: "destructive" });
    }
  };

  const handleChangePlan = async (priceId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch {
      toast({ title: "Unable to start checkout", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current Plan</CardTitle>
        </CardHeader>
        <CardContent>
          {subLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-60" />
            </div>
          ) : sub?.subscribed && tierInfo ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold">{tierInfo.name}</span>
                <span className="text-lg text-muted-foreground">{tierInfo.price}/mo</span>
                <Badge variant={sub.status === "trialing" ? "secondary" : "default"} className="capitalize">
                  {sub.status === "trialing" ? "Trial" : sub.status}
                </Badge>
              </div>
              {sub.subscription_end && (
                <p className="text-sm text-muted-foreground">
                  Current period ends {new Date(sub.subscription_end).toLocaleDateString()}
                </p>
              )}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={handleManageBilling} className="gap-1.5">
                  <CreditCard className="h-4 w-4" /> Manage Billing
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">No active subscription.</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(STRIPE_TIERS).map(([key, tier]) => (
                  <Button
                    key={key}
                    variant={tier.highlighted ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleChangePlan(tier.priceId)}
                  >
                    {tier.name} — {tier.price}/mo
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted-foreground">Sources Used</dt>
              <dd className="text-lg font-semibold">
                {sources?.length ?? 0} / {tierInfo?.sourceLimit === Infinity ? "∞" : tierInfo?.sourceLimit ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Briefs This Month</dt>
              <dd className="text-lg font-semibold">{briefsCount ?? 0}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment & History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Manage your payment method and view billing history via the billing portal.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleManageBilling} className="gap-1.5">
              <CreditCard className="h-4 w-4" /> Update Payment Method
            </Button>
            <Button variant="outline" size="sm" onClick={handleManageBilling} className="gap-1.5">
              <ExternalLink className="h-4 w-4" /> View Billing History
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Plan Comparison */}
      {sub?.subscribed && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Change Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              {Object.entries(STRIPE_TIERS).map(([key, tier]) => {
                const isCurrent = key === tierKey;
                return (
                  <div
                    key={key}
                    className={`rounded-lg border p-4 ${isCurrent ? "border-primary bg-primary/5" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm">{tier.name}</span>
                      {isCurrent && <Badge variant="outline" className="text-[10px]">Current</Badge>}
                    </div>
                    <p className="text-lg font-bold">{tier.price}<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
                    <ul className="mt-2 space-y-1">
                      {tier.features.slice(0, 3).map((f) => (
                        <li key={f} className="text-xs text-muted-foreground">• {f}</li>
                      ))}
                    </ul>
                    {!isCurrent && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-3 gap-1"
                        onClick={() => handleChangePlan(tier.priceId)}
                      >
                        Switch <ArrowUpRight className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
