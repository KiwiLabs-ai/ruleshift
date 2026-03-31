import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { AlertFilters } from "@/components/alerts/AlertFilters";
import { AlertCard } from "@/components/alerts/AlertCard";
import { AlertsEmptyState } from "@/components/alerts/AlertsEmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAlertsPage, defaultFilters } from "@/hooks/use-alerts-data";

const Alerts = () => {
  const navigate = useNavigate();
  const {
    filters,
    setFilters,
    alerts,
    total,
    isLoading,
    sources,
    markRead,
    markAllRead,
    loadMore,
    limit,
  } = useAlertsPage();

  const unreadCount = alerts.filter((a: any) => !a.is_read).length;
  const hasFilters = JSON.stringify(filters) !== JSON.stringify(defaultFilters);

  const handleClick = (alert: any) => {
    if (!alert.is_read) markRead(alert.id);
    if (alert.brief_id) {
      navigate(`/briefs/${alert.brief_id}`);
    }
  };

  return (
    <DashboardLayout unreadCount={unreadCount}>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Alerts</h1>
          <p className="text-sm text-muted-foreground">
            All detected policy changes and impact briefs
          </p>
        </div>

        <AlertFilters
          filters={filters}
          onChange={setFilters}
          sources={sources}
          unreadCount={unreadCount}
          onMarkAllRead={markAllRead}
        />

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <AlertsEmptyState filtered={hasFilters} />
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Showing {alerts.length} of {total} alerts
            </p>
            <div className="space-y-2">
              {alerts.map((alert: any) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onMarkRead={markRead}
                  onClick={handleClick}
                />
              ))}
            </div>
            {alerts.length < total && (
              <div className="flex justify-center pt-2">
                <Button variant="outline" onClick={loadMore}>
                  Load More
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Alerts;
