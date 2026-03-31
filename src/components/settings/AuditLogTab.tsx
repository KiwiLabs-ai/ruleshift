import { useState } from "react";
import { formatDistanceToNow, subDays } from "date-fns";
import { Download, Filter, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuditLog } from "@/hooks/use-settings-data";
import { useOrganizationId } from "@/hooks/use-dashboard-data";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const actionColors: Record<string, string> = {
  source_added: "bg-green-100 text-green-800 border-green-300",
  source_removed: "bg-red-100 text-red-800 border-red-300",
  alert_actioned: "bg-blue-100 text-blue-800 border-blue-300",
  settings_updated: "bg-yellow-100 text-yellow-800 border-yellow-300",
  brief_generated: "bg-purple-100 text-purple-800 border-purple-300",
  member_invited: "bg-teal-100 text-teal-800 border-teal-300",
  source_checked: "bg-sky-100 text-sky-800 border-sky-300",
  sample_data: "bg-gray-100 text-gray-800 border-gray-300",
};

const DATE_RANGES = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "all", label: "All Time" },
] as const;

export function AuditLogTab() {
  const { data: orgId } = useOrganizationId();
  const { data: logs, isLoading } = useAuditLog(orgId);
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState("30");
  const [exporting, setExporting] = useState(false);

  const filtered = logs?.filter((l: any) => {
    // Date filter
    if (dateRange !== "all") {
      const cutoff = subDays(new Date(), parseInt(dateRange));
      if (new Date(l.created_at) < cutoff) return false;
    }
    // Search filter
    if (search) {
      const q = search.toLowerCase();
      return (
        l.action.toLowerCase().includes(q) ||
        l.details?.toLowerCase().includes(q) ||
        l.user_email?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleExport = async () => {
    if (!orgId) return;
    setExporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const params = new URLSearchParams({ org_id: orgId });
      if (dateRange !== "all") {
        params.set("start_date", subDays(new Date(), parseInt(dateRange)).toISOString());
      }

      const { data, error } = await supabase.functions.invoke("export-audit-log", {
        body: {
          org_id: orgId,
          start_date: dateRange !== "all" ? subDays(new Date(), parseInt(dateRange)).toISOString() : undefined,
        },
      });

      if (error) throw error;

      // data comes back as text from the edge function
      const csvContent = typeof data === "string" ? data : JSON.stringify(data);
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ruleshift-audit-log-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: "Audit log exported" });
    } catch (err: any) {
      console.error("Export failed:", err);
      toast({
        title: "Export failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Filter by action, user, or details…"
          className="flex-1 min-w-[200px] h-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_RANGES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={handleExport}
          disabled={exporting || !orgId}
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {exporting ? "Exporting…" : "Download CSV"}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : !filtered?.length ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Filter className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <h3 className="text-base font-semibold">No audit entries</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Actions taken in your account will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((entry: any) => (
            <div
              key={entry.id}
              className="flex items-start gap-3 rounded-lg border bg-card p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${actionColors[entry.action] ?? ""}`}
                  >
                    {entry.action.replace(/_/g, " ")}
                  </Badge>
                  {entry.resource_name && (
                    <span className="text-xs text-foreground font-medium">{entry.resource_name}</span>
                  )}
                  {entry.user_email && (
                    <span className="text-xs text-muted-foreground">{entry.user_email}</span>
                  )}
                </div>
                {entry.details && (
                  <p className="text-sm text-muted-foreground mt-0.5">{entry.details}</p>
                )}
              </div>
              <span
                className="text-xs text-muted-foreground shrink-0"
                title={new Date(entry.created_at).toLocaleString()}
              >
                {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
