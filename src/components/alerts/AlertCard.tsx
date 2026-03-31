import { formatDistanceToNow } from "date-fns";
import { Eye, ChevronRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const severityConfig: Record<string, { color: string; border: string; label: string }> = {
  critical: { color: "bg-destructive", border: "border-l-destructive", label: "Critical" },
  important: { color: "bg-yellow-500", border: "border-l-yellow-500", label: "Important" },
  informational: { color: "bg-blue-500", border: "border-l-blue-500", label: "Info" },
};

interface AlertCardProps {
  alert: {
    id: string;
    title: string;
    severity: string;
    source_name: string;
    is_read: boolean;
    created_at: string;
    brief_id: string | null;
    briefs: { id: string; title: string; summary: string | null; content: string | null; source_name: string; actioned_at: string | null } | null;
  };
  onMarkRead: (id: string) => void;
  onClick: (alert: any) => void;
}

export function AlertCard({ alert, onMarkRead, onClick }: AlertCardProps) {
  const config = severityConfig[alert.severity] ?? severityConfig.informational;
  const summary = alert.briefs?.summary;
  const isActioned = !!alert.briefs?.actioned_at;

  return (
    <button
      onClick={() => onClick(alert)}
      className={cn(
        "w-full text-left rounded-lg border bg-card transition-colors hover:bg-accent/50 overflow-hidden flex",
        config.border,
        "border-l-4",
        !alert.is_read && "ring-1 ring-primary/10"
      )}
    >
      <div className="flex-1 p-4 min-w-0">
        <div className="flex items-start gap-2">
          {!alert.is_read && (
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
          )}
          <div className="min-w-0 flex-1">
            <p className={cn("text-sm leading-tight", !alert.is_read ? "font-semibold text-foreground" : "text-foreground/80")}>
              {alert.title.replace(/^Sample:\s*/, "")}
            </p>
            {alert.title.startsWith("Sample:") && (
              <Badge variant="outline" className="text-[9px] h-4 px-1.5 text-muted-foreground border-muted-foreground/30 mt-0.5">SAMPLE</Badge>
            )}
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[10px] h-5">{config.label}</Badge>
                {isActioned && (
                  <Badge className="text-[10px] h-5 bg-green-100 text-green-800 border-green-300 gap-0.5">
                    <CheckCircle2 className="h-3 w-3" /> Actioned
                  </Badge>
                )}
              <span className="text-xs text-muted-foreground">{alert.source_name}</span>
              <span className="text-xs text-muted-foreground" title={new Date(alert.created_at).toLocaleString()}>
                {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
              </span>
            </div>
            {summary && (
              <p className="mt-1.5 text-xs text-muted-foreground line-clamp-1">{summary}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 pr-3 shrink-0">
        {!alert.is_read && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs"
            onClick={(e) => { e.stopPropagation(); onMarkRead(alert.id); }}
          >
            <Eye className="h-3.5 w-3.5 mr-1" /> Read
          </Button>
        )}
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </button>
  );
}
