import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, X } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { ArchiveFilters } from "@/hooks/use-archive-data";

const severityOptions = [
  { value: "critical", label: "Critical", color: "bg-destructive" },
  { value: "important", label: "Important", color: "bg-yellow-500" },
  { value: "informational", label: "Informational", color: "bg-blue-500" },
];

interface ArchiveFilterSidebarProps {
  filters: ArchiveFilters;
  onChange: (filters: ArchiveFilters) => void;
  sources: string[];
  tags: string[];
}

export function ArchiveFilterSidebar({ filters, onChange, sources, tags }: ArchiveFilterSidebarProps) {
  const toggleArray = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];

  const hasFilters =
    filters.severities.length > 0 ||
    filters.sources.length > 0 ||
    filters.tags.length > 0 ||
    filters.dateFrom ||
    filters.dateTo ||
    (filters.actioned && filters.actioned !== "all");

  return (
    <aside className="w-full space-y-6">
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-1 text-xs text-muted-foreground"
          onClick={() => onChange({ severities: [], sources: [], tags: [], actioned: "all" })}
        >
          <X className="h-3 w-3" /> Clear all filters
        </Button>
      )}

      {/* Severity */}
      <FilterSection title="Severity">
        {severityOptions.map((s) => (
          <label key={s.value} className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={filters.severities.includes(s.value)}
              onCheckedChange={() =>
                onChange({ ...filters, severities: toggleArray(filters.severities, s.value) })
              }
            />
            <span className={cn("h-2 w-2 rounded-full", s.color)} />
            <span className="text-sm">{s.label}</span>
          </label>
        ))}
      </FilterSection>

      {/* Actioned Status */}
      <FilterSection title="Status">
        <RadioGroup
          value={filters.actioned || "all"}
          onValueChange={(val) => onChange({ ...filters, actioned: val as any })}
          className="space-y-1.5"
        >
          {[
            { value: "all", label: "All" },
            { value: "actioned", label: "Actioned" },
            { value: "not_actioned", label: "Not Actioned" },
          ].map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
              <RadioGroupItem value={opt.value} />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </RadioGroup>
      </FilterSection>

      {/* Sources */}
      {sources.length > 0 && (
        <FilterSection title="Source">
          {sources.map((s) => (
            <label key={s} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={filters.sources.includes(s)}
                onCheckedChange={() =>
                  onChange({ ...filters, sources: toggleArray(filters.sources, s) })
                }
              />
              <span className="text-sm truncate">{s}</span>
            </label>
          ))}
        </FilterSection>
      )}

      {/* Date Range */}
      <FilterSection title="Date Range">
        <div className="space-y-2">
          <DatePickerField
            label="From"
            date={filters.dateFrom}
            onSelect={(d) => onChange({ ...filters, dateFrom: d })}
          />
          <DatePickerField
            label="To"
            date={filters.dateTo}
            onSelect={(d) => onChange({ ...filters, dateTo: d })}
          />
        </div>
      </FilterSection>

      {/* Tags */}
      {tags.length > 0 && (
        <FilterSection title="Regulation / Tags">
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <Button
                key={t}
                size="sm"
                variant={filters.tags.includes(t) ? "default" : "outline"}
                className="h-6 rounded-full text-[11px] px-2.5"
                onClick={() => onChange({ ...filters, tags: toggleArray(filters.tags, t) })}
              >
                {t}
              </Button>
            ))}
          </div>
        </FilterSection>
      )}
    </aside>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{title}</h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function DatePickerField({
  label,
  date,
  onSelect,
}: {
  label: string;
  date?: Date;
  onSelect: (d: Date | undefined) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left text-xs h-8 font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-3 w-3" />
          {date ? format(date, "MMM d, yyyy") : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onSelect}
          initialFocus
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}
