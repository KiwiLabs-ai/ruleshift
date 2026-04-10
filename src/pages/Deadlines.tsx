import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageErrorBoundary } from "@/components/PageErrorBoundary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/hooks/use-toast";
import { apiCall } from "@/lib/api";
import {
  Calendar,
  List,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Download,
  Loader2,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  differenceInDays,
  getDay,
} from "date-fns";
import { useOrganizationId } from "@/hooks/use-dashboard-data";
import { useAllDeadlines, type DeadlineItem } from "@/hooks/use-deadlines-data";

type ViewMode = "calendar" | "list";

function urgencyBadge(daysUntil: number) {
  if (daysUntil < 0)
    return { label: "Overdue", className: "bg-destructive text-destructive-foreground" };
  if (daysUntil <= 7)
    return { label: `${daysUntil}d`, className: "bg-destructive text-destructive-foreground" };
  if (daysUntil <= 30)
    return { label: `${daysUntil}d`, className: "bg-yellow-500 text-white" };
  return { label: `${daysUntil}d`, className: "bg-emerald-500 text-white" };
}

function DeadlineRow({ item }: { item: DeadlineItem }) {
  const deadlineDate = new Date(item.deadlineDate + "T00:00:00");
  const daysUntil = differenceInDays(deadlineDate, new Date());
  const badge = urgencyBadge(daysUntil);

  return (
    <Link
      to={`/briefs/${item.briefId}`}
      className="group flex items-center gap-4 rounded-lg border border-border px-4 py-3 transition-colors hover:bg-muted/60"
    >
      <div className="flex-1 min-w-0">
        <span className="block truncate text-sm font-medium text-foreground">
          {item.title}
        </span>
        <span className="text-xs text-muted-foreground">{item.sourceName}</span>
      </div>
      <span className="text-sm tabular-nums text-muted-foreground shrink-0">
        {format(deadlineDate, "MMM d, yyyy")}
      </span>
      <Badge className={`text-[10px] px-1.5 shrink-0 ${badge.className}`}>
        {badge.label}
      </Badge>
    </Link>
  );
}

function CalendarView({
  deadlines,
  currentMonth,
  onMonthChange,
}: {
  deadlines: DeadlineItem[];
  currentMonth: Date;
  onMonthChange: (d: Date) => void;
}) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad the start of the calendar to align with weekday headers
  const startPadding = getDay(monthStart);

  const deadlinesByDate = useMemo(() => {
    const map = new Map<string, DeadlineItem[]>();
    for (const d of deadlines) {
      const key = d.deadlineDate;
      const existing = map.get(key);
      if (existing) {
        existing.push(d);
      } else {
        map.set(key, [d]);
      }
    }
    return map;
  }, [deadlines]);

  const selectedDeadlines = selectedDate
    ? deadlinesByDate.get(format(selectedDate, "yyyy-MM-dd")) ?? []
    : [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onMonthChange(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="text-base">
            {format(currentMonth, "MMMM yyyy")}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onMonthChange(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-7 gap-px">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div
                key={d}
                className="py-2 text-center text-[11px] font-medium text-muted-foreground"
              >
                {d}
              </div>
            ))}

            {/* Empty cells for padding */}
            {Array.from({ length: startPadding }).map((_, i) => (
              <div key={`pad-${i}`} className="h-14" />
            ))}

            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayDeadlines = deadlinesByDate.get(key);
              const hasDeadlines = !!dayDeadlines && dayDeadlines.length > 0;
              const selected = selectedDate && isSameDay(day, selectedDate);
              const today = isToday(day);
              const inMonth = isSameMonth(day, currentMonth);

              // Determine dot color by most urgent deadline on this day
              let dotColor = "bg-emerald-500";
              if (hasDeadlines) {
                const daysUntil = differenceInDays(day, new Date());
                if (daysUntil < 0) dotColor = "bg-destructive";
                else if (daysUntil <= 7) dotColor = "bg-destructive";
                else if (daysUntil <= 30) dotColor = "bg-yellow-500";
              }

              return (
                <button
                  key={key}
                  onClick={() => hasDeadlines && setSelectedDate(day)}
                  className={`relative flex flex-col items-center justify-start h-14 rounded-md transition-colors ${
                    !inMonth ? "text-muted-foreground/30" : ""
                  } ${selected ? "bg-secondary/10 ring-1 ring-secondary" : ""} ${
                    today && !selected ? "bg-muted" : ""
                  } ${hasDeadlines ? "cursor-pointer hover:bg-muted/80" : "cursor-default"}`}
                >
                  <span
                    className={`mt-1.5 text-sm tabular-nums ${
                      today ? "font-bold text-secondary" : ""
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                  {hasDeadlines && (
                    <div className="flex gap-0.5 mt-1">
                      {dayDeadlines.slice(0, 3).map((_, i) => (
                        <span
                          key={i}
                          className={`h-1.5 w-1.5 rounded-full ${dotColor}`}
                        />
                      ))}
                      {dayDeadlines.length > 3 && (
                        <span className="text-[8px] text-muted-foreground leading-none">
                          +{dayDeadlines.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {selectedDate && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {format(selectedDate, "EEEE, MMMM d, yyyy")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-4 pt-0">
            {selectedDeadlines.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No deadlines on this date.
              </p>
            ) : (
              selectedDeadlines.map((d) => (
                <DeadlineRow key={d.briefId} item={d} />
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ListView({
  overdue,
  upcoming,
}: {
  overdue: DeadlineItem[];
  upcoming: DeadlineItem[];
}) {
  return (
    <div className="space-y-6">
      {overdue.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Overdue ({overdue.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-4 pt-0">
            {overdue.map((d) => (
              <DeadlineRow key={d.briefId} item={d} />
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            Upcoming ({upcoming.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-4 pt-0">
          {upcoming.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No upcoming deadlines"
              description="When briefs contain compliance deadlines, they'll appear here."
            />
          ) : (
            upcoming.map((d) => <DeadlineRow key={d.briefId} item={d} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const DeadlinesPage = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const { data: orgId } = useOrganizationId();
  const { data: allDeadlines, isLoading } = useAllDeadlines(orgId);

  const handleExportIcal = async () => {
    setIsExporting(true);
    try {
      const { error, rawResponse } = await apiCall(
        "export-deadlines-ical",
        undefined,
        { method: "GET", raw: true }
      );
      if (error) throw new Error(error);
      if (!rawResponse) throw new Error("No response received");

      const blob = await rawResponse.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ruleshift-deadlines.ics";
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: "Deadlines exported", description: "Import the .ics file into your calendar app." });
    } catch (err: any) {
      toast({
        title: "Export failed",
        description: err?.message ?? "Could not export deadlines.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const filtered = useMemo(() => {
    if (!allDeadlines) return [];
    if (!sourceFilter) return allDeadlines;
    return allDeadlines.filter((d) =>
      d.sourceName.toLowerCase().includes(sourceFilter.toLowerCase())
    );
  }, [allDeadlines, sourceFilter]);

  const today = new Date().toISOString().split("T")[0];
  const overdue = filtered.filter((d) => d.deadlineDate < today);
  const upcoming = filtered.filter((d) => d.deadlineDate >= today);

  const uniqueSources = useMemo(() => {
    if (!allDeadlines) return [];
    return [...new Set(allDeadlines.map((d) => d.sourceName))].sort();
  }, [allDeadlines]);

  return (
    <DashboardLayout>
      <PageErrorBoundary pageName="Deadlines">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Deadlines</h1>
              <p className="text-sm text-muted-foreground">
                Regulatory compliance deadlines from your monitored sources
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportIcal}
                disabled={isExporting || !allDeadlines?.length}
                className="gap-1.5"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Export .ics
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="gap-1.5"
              >
                <List className="h-4 w-4" />
                List
              </Button>
              <Button
                variant={viewMode === "calendar" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("calendar")}
                className="gap-1.5"
              >
                <Calendar className="h-4 w-4" />
                Calendar
              </Button>
            </div>
          </div>

          {uniqueSources.length > 1 && (
            <div className="flex items-center gap-2">
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              >
                <option value="">All sources</option>
                {uniqueSources.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {sourceFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSourceFilter("")}
                >
                  Clear
                </Button>
              )}
            </div>
          )}

          {isLoading ? (
            <Card>
              <CardContent className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </CardContent>
            </Card>
          ) : filtered.length === 0 && !sourceFilter ? (
            <Card>
              <CardContent className="p-12">
                <EmptyState
                  icon={Calendar}
                  title="No deadlines tracked yet"
                  description="When your monitored sources mention compliance deadlines, effective dates, or comment period closings, they'll be extracted and shown here automatically."
                />
              </CardContent>
            </Card>
          ) : viewMode === "list" ? (
            <ListView overdue={overdue} upcoming={upcoming} />
          ) : (
            <CalendarView
              deadlines={filtered}
              currentMonth={currentMonth}
              onMonthChange={setCurrentMonth}
            />
          )}
        </div>
      </PageErrorBoundary>
    </DashboardLayout>
  );
};

export default DeadlinesPage;
