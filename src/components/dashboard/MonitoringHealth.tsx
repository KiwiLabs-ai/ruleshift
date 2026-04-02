import { Activity, RefreshCw, Zap, FileText, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { apiCall } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface HealthData {
  totalSources: number;
  healthyCount: number;
  delayedCount: number;
  erroredCount: number;
  alertCount7d: number;
  briefCount7d: number;
  recentAlert: { createdAt: string; sourceName: string } | null;
  recentBrief: { createdAt: string } | null;
}

interface Props {
  data: HealthData | null | undefined;
  loading: boolean;
  orgId: string;
}

export function MonitoringHealth({ data, loading, orgId }: Props) {
  const [scanning, setScanning] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const handleFullScan = async () => {
    setScanning(true);
    try {
      const { data: result, error } = await apiCall("monitor-sources", { org_id: orgId, batch_size: 100 });
      if (error) throw new Error(error);
      toast({
        title: "Full scan complete",
        description: `Checked ${result.sources_checked} sources. ${result.changes_detected} change(s) detected.`,
      });
      queryClient.invalidateQueries({ queryKey: ["monitoring-health"] });
      queryClient.invalidateQueries({ queryKey: ["active-sources"] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    } catch (err: any) {
      toast({ title: "Scan failed", description: err.message, variant: "destructive" });
    } finally {
      setScanning(false);
    }
  };

  // Status determination
  let statusColor: string;
  let statusBg: string;
  let statusLabel: string;

  if (data.erroredCount > 0) {
    statusColor = "bg-destructive";
    statusBg = "bg-destructive/10 text-destructive border-destructive/30";
    statusLabel = "Sources in Error";
  } else if (data.delayedCount > 0) {
    statusColor = "bg-yellow-500";
    statusBg = "bg-yellow-100 text-yellow-800 border-yellow-300";
    statusLabel = "Some Sources Delayed";
  } else {
    statusColor = "bg-emerald-500";
    statusBg = "bg-emerald-100 text-emerald-800 border-emerald-300";
    statusLabel = "All Systems Operational";
  }

  return (
    <Card className="border-t-2 border-t-secondary">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/[0.08]">
            <Activity className="h-4 w-4 text-secondary" />
          </div>
          <CardTitle className="text-sm font-semibold">Monitoring Health</CardTitle>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs h-7"
          onClick={handleFullScan}
          disabled={scanning}
        >
          <RefreshCw className={`h-3 w-3 ${scanning ? "animate-spin" : ""}`} />
          {scanning ? "Scanning…" : "Run Full Scan"}
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Engine Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${statusColor} animate-pulse`} />
            <Badge variant="outline" className={statusBg}>
              {statusLabel}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            <span className="text-emerald-600 font-medium">{data.healthyCount}</span> healthy
            {data.delayedCount > 0 && (
              <> · <span className="text-yellow-600 font-medium">{data.delayedCount}</span> delayed</>
            )}
            {data.erroredCount > 0 && (
              <> · <span className="text-destructive font-medium">{data.erroredCount}</span> errored</>
            )}
          </p>
        </div>

        {/* Pipeline Activity */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/50 p-3 space-y-1">
            <div className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-secondary" />
              <span className="text-xs font-medium text-foreground">Changes (7d)</span>
            </div>
            <p className="text-lg font-bold text-foreground">{data.alertCount7d}</p>
            {data.recentAlert ? (
              <p className="text-[11px] text-muted-foreground leading-tight">
                Last: {formatDistanceToNow(new Date(data.recentAlert.createdAt), { addSuffix: true })} from {data.recentAlert.sourceName}
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">No changes yet</p>
            )}
          </div>

          <div className="rounded-lg bg-muted/50 p-3 space-y-1">
            <div className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-foreground">Briefs (7d)</span>
            </div>
            <p className="text-lg font-bold text-foreground">{data.briefCount7d}</p>
            {data.recentBrief ? (
              <p className="text-[11px] text-muted-foreground leading-tight">
                Last: {formatDistanceToNow(new Date(data.recentBrief.createdAt), { addSuffix: true })}
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">No briefs yet</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
