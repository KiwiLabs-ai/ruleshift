import { useEffect, useCallback, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageErrorBoundary } from "@/components/PageErrorBoundary";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { RecentAlerts } from "@/components/dashboard/RecentAlerts";
import { ActivityTimeline } from "@/components/dashboard/ActivityTimeline";
import { DashboardActivityChart } from "@/components/dashboard/DashboardActivityChart";
import { MonitoringStatus } from "@/components/dashboard/MonitoringStatus";
import { MonitoringHealth } from "@/components/dashboard/MonitoringHealth";
import { UpgradeBanner } from "@/components/dashboard/UpgradeBanner";
import { WelcomeModal, shouldShowWelcomeModal } from "@/components/dashboard/WelcomeModal";
import { Shield, Plus, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  useOrganizationId,
  useActiveSources,
  useAlerts,
  useBriefsThisMonth,
  useActivityEvents,
  useRealtimeAlerts,
} from "@/hooks/use-dashboard-data";
import { useHealthData } from "@/hooks/use-health-data";
import { useActivityChart } from "@/hooks/use-activity-chart";

const Dashboard = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showWelcome, setShowWelcome] = useState(() =>
    shouldShowWelcomeModal(searchParams)
  );
  const isFreeWelcome = searchParams.get("welcome") === "free";

  const { data: orgId, isLoading: orgLoading } = useOrganizationId();
  const { data: sources, isLoading: srcLoading } = useActiveSources(orgId);
  const { data: alerts, isLoading: alertLoading, refetch: refetchAlerts } = useAlerts(orgId);
  const { data: monthChanges, isLoading: briefLoading } = useBriefsThisMonth(orgId);
  const { data: events, isLoading: evtLoading } = useActivityEvents(orgId);
  const { data: healthData, isLoading: healthLoading } = useHealthData(orgId);
  const { data: chartData, isLoading: chartLoading } = useActivityChart(orgId);

  const stableRefetch = useCallback(() => { refetchAlerts(); }, [refetchAlerts]);
  useRealtimeAlerts(orgId, stableRefetch);

  const handleDismissWelcome = () => {
    setShowWelcome(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("checkout");
    url.searchParams.delete("welcome");
    navigate(url.pathname + url.search, { replace: true });
  };

  // Free-tier welcome toast
  useEffect(() => {
    if (isFreeWelcome && orgId) {
      toast({
        title: "Welcome to RuleShift!",
        description: "You're on the Free plan — upgrade anytime for more sources and features.",
      });
      // Fire seed-sample-data for free users
      supabase.functions
        .invoke("seed-sample-data", { body: { organization_id: orgId, user_id: undefined } })
        .catch(() => {});
      // Fire initial scan
      supabase.functions
        .invoke("monitor-sources", { body: { org_id: orgId } })
        .catch(() => {});
      // Clear URL param
      const url = new URL(window.location.href);
      url.searchParams.delete("welcome");
      navigate(url.pathname + url.search, { replace: true });
    }
  }, [isFreeWelcome, orgId]);

  const loading = orgLoading;
  const dataLoading = loading || srcLoading || alertLoading || briefLoading || evtLoading;
  const unreadAlerts = alerts?.filter((a) => !a.is_read) ?? [];
  const criticalUnread = unreadAlerts.filter((a) => a.severity === "critical");

  const hasSources = (sources?.length ?? 0) > 0;
  const hasAlerts = (alerts?.length ?? 0) > 0;
  const hasEvents = ((events as any)?.length ?? 0) > 0;
  const showEmptyState = !dataLoading && !hasAlerts && !hasEvents;

  return (
    <DashboardLayout unreadCount={unreadAlerts.length}>
      <PageErrorBoundary pageName="Dashboard">
      <div className="space-y-6">
        <UpgradeBanner />

        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Your policy monitoring overview</p>
        </div>

        <StatsCards
          activeSources={sources?.length ?? 0}
          unreadAlerts={unreadAlerts.length}
          monthChanges={monthChanges ?? 0}
          criticalItems={criticalUnread.length}
          loading={loading || srcLoading || alertLoading || briefLoading}
        />

        <DashboardActivityChart data={chartData} loading={chartLoading} />

        {orgId && (
          <MonitoringHealth data={healthData} loading={healthLoading} orgId={orgId} />
        )}

        {showEmptyState ? (
          <div className="flex justify-center py-8">
            <Card className="relative max-w-lg w-full p-8 text-center overflow-hidden">
              <Star className="absolute top-4 right-6 h-4 w-4 text-secondary/20 rotate-12" />
              <Star className="absolute top-12 left-8 h-3 w-3 text-secondary/20 -rotate-[20deg]" />
              <Star className="absolute bottom-6 right-12 h-3.5 w-3.5 text-secondary/20 rotate-45" />
              <Star className="absolute bottom-10 left-10 h-3 w-3 text-secondary/20 rotate-[70deg]" />

              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary/10">
                <Shield className="h-8 w-8 text-secondary" />
              </div>

              {hasSources ? (
                <>
                  <h2 className="text-xl font-bold font-display text-foreground">Welcome to RuleShift!</h2>
                  <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
                    You're all set up. We're now monitoring your selected sources. Your first policy brief will arrive within 24 hours.
                  </p>
                  <Button asChild variant="outline" className="mt-5 gap-1.5">
                    <Link to="/sources">Go to Sources →</Link>
                  </Button>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-bold font-display text-foreground">Get Started</h2>
                  <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
                    Add your first policy sources to start monitoring for changes that affect your business.
                  </p>
                  <Button asChild className="mt-5 gap-1.5">
                    <Link to="/sources"><Plus className="h-4 w-4" /> Add Sources</Link>
                  </Button>
                </>
              )}
            </Card>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3 space-y-6">
              <RecentAlerts alerts={alerts ?? []} loading={loading || alertLoading} />
              <MonitoringStatus sources={(sources as any) ?? []} loading={loading || srcLoading} />
            </div>
            <div className="lg:col-span-2">
              <ActivityTimeline events={(events as any) ?? []} loading={loading || evtLoading} />
            </div>
          </div>
        )}
      </div>

      {/* Welcome modal after checkout */}
      {showWelcome && orgId && (
        <WelcomeModal orgId={orgId} onDismiss={handleDismissWelcome} />
      )}
      </PageErrorBoundary>
    </DashboardLayout>
  );
};

export default Dashboard;
