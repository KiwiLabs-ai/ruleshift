import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, ChevronRight } from "lucide-react";
import { formatDistanceToNow, differenceInMinutes } from "date-fns";

interface Alert {
  id: string;
  title: string;
  source_name: string;
  severity: string;
  is_read: boolean;
  brief_id: string | null;
  created_at: string;
}

const severityRow: Record<string, { border: string; bg: string; badge: string }> = {
  critical: { border: "border-l-[3px] border-destructive", bg: "bg-destructive/[0.03]", badge: "bg-destructive text-destructive-foreground" },
  important: { border: "border-l-[3px] border-yellow-500", bg: "bg-yellow-500/[0.03]", badge: "bg-yellow-500 text-white" },
  informational: { border: "border-l-[3px] border-blue-500", bg: "bg-blue-500/[0.03]", badge: "bg-blue-500 text-white" },
};

export function RecentAlerts({ alerts, loading }: { alerts: Alert[]; loading?: boolean }) {
  const recent = alerts.slice(0, 5);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Recent Alerts</CardTitle>
        <Link to="/alerts" className="text-xs font-medium text-primary hover:underline">View All</Link>
      </CardHeader>
      <CardContent className="space-y-1 p-4 pt-0">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 px-3 py-2.5">
              <Skeleton className="h-2 w-2 rounded-full mt-1.5 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-14 rounded-full" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))
        ) : recent.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Shield className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="font-semibold text-muted-foreground">All clear</p>
            <p className="text-sm text-muted-foreground/70 mt-1 text-center max-w-[240px]">
              When policy changes are detected, alerts will appear here.
            </p>
          </div>
        ) : (
          recent.map((a) => {
            const style = severityRow[a.severity] ?? severityRow.informational;
            const minutesAgo = differenceInMinutes(new Date(), new Date(a.created_at));
            const isVeryRecent = minutesAgo < 60;

            return (
              <Link
                key={a.id}
                to={a.brief_id ? `/briefs/${a.brief_id}` : "#"}
                className={`group flex items-start gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-muted/60 ${style.border} ${style.bg} ${!a.is_read ? "bg-primary/[0.02]" : ""}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge className={`text-[9px] px-1.5 py-0 rounded-full ${style.badge}`}>
                      {a.severity}
                    </Badge>
                    <span className={`truncate text-sm text-foreground ${!a.is_read ? "font-medium" : ""}`}>{a.title.replace(/^Sample:\s*/, "")}</span>
                    {a.title.startsWith("Sample:") && (
                      <span className="text-[8px] uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0 rounded-sm font-medium shrink-0">SAMPLE</span>
                    )}
                    {!a.is_read && isVeryRecent && !a.title.startsWith("Sample:") && (
                      <span className="text-[8px] uppercase tracking-wider text-secondary bg-secondary/10 px-1 py-0 rounded-sm font-medium shrink-0">NEW</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{a.source_name}</span>
                    <span>·</span>
                    <span>{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors mt-1.5" />
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
