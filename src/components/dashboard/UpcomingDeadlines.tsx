import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, ChevronRight } from "lucide-react";
import { differenceInDays, format } from "date-fns";
import { EmptyState } from "@/components/ui/EmptyState";
import type { DeadlineItem } from "@/hooks/use-deadlines-data";

function urgencyStyle(daysUntil: number) {
  if (daysUntil <= 7) {
    return {
      border: "border-l-[3px] border-destructive",
      bg: "bg-destructive/[0.03]",
      dot: "bg-destructive",
      label: daysUntil <= 0 ? "Overdue" : `${daysUntil}d`,
      labelClass: "text-destructive font-semibold",
    };
  }
  if (daysUntil <= 30) {
    return {
      border: "border-l-[3px] border-yellow-500",
      bg: "bg-yellow-500/[0.03]",
      dot: "bg-yellow-500",
      label: `${daysUntil}d`,
      labelClass: "text-yellow-600 font-medium",
    };
  }
  return {
    border: "border-l-[3px] border-emerald-500",
    bg: "bg-emerald-500/[0.03]",
    dot: "bg-emerald-500",
    label: `${daysUntil}d`,
    labelClass: "text-emerald-600",
  };
}

export function UpcomingDeadlines({
  deadlines,
  loading,
}: {
  deadlines: DeadlineItem[];
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          Upcoming Deadlines
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 p-4 pt-0">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5">
              <Skeleton className="h-2 w-2 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-4 w-10" />
            </div>
          ))
        ) : deadlines.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No upcoming deadlines"
            description="When briefs contain compliance deadlines, they'll appear here."
          />
        ) : (
          deadlines.map((d) => {
            const deadlineDate = new Date(d.deadlineDate + "T00:00:00");
            const daysUntil = differenceInDays(deadlineDate, new Date());
            const style = urgencyStyle(daysUntil);

            return (
              <Link
                key={d.briefId}
                to={`/briefs/${d.briefId}`}
                className={`group flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-muted/60 ${style.border} ${style.bg}`}
              >
                <div className="flex-1 min-w-0">
                  <span className="block truncate text-sm text-foreground">
                    {d.title}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{d.sourceName}</span>
                    <span>·</span>
                    <span>{format(deadlineDate, "MMM d, yyyy")}</span>
                  </div>
                </div>
                <span className={`text-xs tabular-nums shrink-0 ${style.labelClass}`}>
                  {style.label}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors" />
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
