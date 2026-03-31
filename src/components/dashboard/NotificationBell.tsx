import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganizationId } from "@/hooks/use-dashboard-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDistanceToNow } from "date-fns";

const severityDot: Record<string, string> = {
  critical: "bg-destructive",
  important: "bg-yellow-500",
  informational: "bg-blue-500",
};

export function NotificationBell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: orgId } = useOrganizationId();

  const { data: alerts } = useQuery({
    queryKey: ["notification-bell", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("id, title, severity, source_name, created_at, is_read, brief_id")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 30000,
  });

  const unreadCount = useQuery({
    queryKey: ["notification-bell-count", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("alerts")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId!)
        .eq("is_read", false);
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 30000,
  });

  // Realtime subscription
  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel("notification-bell-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alerts", filter: `organization_id=eq.${orgId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notification-bell"] });
          queryClient.invalidateQueries({ queryKey: ["notification-bell-count"] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId, queryClient]);

  const count = unreadCount.data ?? 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-semibold">Notifications</span>
          {count > 0 && (
            <Badge variant="secondary" className="text-[10px] h-5">{count} unread</Badge>
          )}
        </div>
        <div className="max-h-72 overflow-y-auto">
          {(!alerts || alerts.length === 0) ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            alerts.map((alert) => (
              <button
                key={alert.id}
                onClick={() => {
                  if (alert.brief_id) navigate(`/briefs/${alert.brief_id}`);
                  else navigate("/alerts");
                }}
                className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border last:border-b-0 ${
                  !alert.is_read ? "bg-primary/5" : ""
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${severityDot[alert.severity] ?? "bg-muted-foreground"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{alert.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {alert.source_name} · {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
        <div className="border-t border-border px-4 py-2">
          <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => navigate("/alerts")}>
            View All Alerts
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
