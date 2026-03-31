import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AlertsFilters, SeverityFilter, StatusFilter, DateRange } from "@/hooks/use-alerts-data";

const severities: { value: SeverityFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "critical", label: "Critical" },
  { value: "important", label: "Important" },
  { value: "informational", label: "Info" },
];

const statuses: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
];

const dateRanges: { value: DateRange; label: string }[] = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
];

interface AlertFiltersProps {
  filters: AlertsFilters;
  onChange: (filters: AlertsFilters) => void;
  sources: string[];
  unreadCount: number;
  onMarkAllRead: () => void;
}

export function AlertFilters({ filters, onChange, sources, unreadCount, onMarkAllRead }: AlertFiltersProps) {
  const update = (partial: Partial<AlertsFilters>) => onChange({ ...filters, ...partial });

  return (
    <div className="space-y-3">
      {/* Severity pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mr-1">Severity</span>
        {severities.map((s) => (
          <Button
            key={s.value}
            size="sm"
            variant={filters.severity === s.value ? "default" : "outline"}
            className="h-7 rounded-full text-xs px-3"
            onClick={() => update({ severity: s.value })}
          >
            {s.label}
          </Button>
        ))}

        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide ml-4 mr-1">Status</span>
        {statuses.map((s) => (
          <Button
            key={s.value}
            size="sm"
            variant={filters.status === s.value ? "default" : "outline"}
            className="h-7 rounded-full text-xs px-3"
            onClick={() => update({ status: s.value })}
          >
            {s.label}
          </Button>
        ))}

        {unreadCount > 0 && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs ml-auto"
            onClick={onMarkAllRead}
          >
            Mark All as Read ({unreadCount})
          </Button>
        )}
      </div>

      {/* Second row: source, date, search */}
      <div className="flex flex-wrap gap-2">
        <Select value={filters.source} onValueChange={(v) => update({ source: v })}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="All Sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {sources.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.dateRange} onValueChange={(v) => update({ dateRange: v as DateRange })}>
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {dateRanges.map((d) => (
              <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search alerts…"
            className="pl-9 h-9"
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
