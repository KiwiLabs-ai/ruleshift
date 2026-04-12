import { useNavigate } from "react-router-dom";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const severityBadge: Record<string, { className: string; label: string }> = {
  critical: { className: "bg-destructive/10 text-destructive border-destructive/30", label: "Critical" },
  important: { className: "bg-yellow-100 text-yellow-800 border-yellow-300", label: "Important" },
  informational: { className: "bg-blue-100 text-blue-800 border-blue-300", label: "Info" },
};

interface ArchiveBriefCardProps {
  brief: any;
  viewMode: "grid" | "list";
  relevance?: number;
}

export function ArchiveBriefCard({ brief, viewMode, relevance }: ArchiveBriefCardProps) {
  const navigate = useNavigate();
  const alert = Array.isArray(brief.alerts) ? brief.alerts?.[0] : brief.alerts;
  const severity = alert?.severity ?? "informational";
  const badge = severityBadge[severity] ?? severityBadge.informational;
  const tags: string[] = brief.tags ?? [];
  const isSample = tags.includes("sample");

  const handleClick = () => {
    if (brief.id) navigate(`/briefs/${brief.id}`);
  };

  if (viewMode === "list") {
    return (
      <button
        onClick={handleClick}
        className="w-full text-left flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">{brief.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {brief.summary || "No summary available"}
          </p>
        </div>
        <Badge className={cn("shrink-0 text-[10px]", badge.className)}>{badge.label}</Badge>
        {isSample && (
          <Badge variant="outline" className="shrink-0 text-[9px] text-muted-foreground border-muted-foreground/30">SAMPLE</Badge>
        )}
        {brief.actioned_at && (
          <Badge className="shrink-0 text-[10px] bg-green-100 text-green-800 border-green-300 gap-0.5">
            <CheckCircle2 className="h-3 w-3" /> Actioned
          </Badge>
        )}
        {brief.actionProgress && brief.actionProgress.total > 0 && (
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {brief.actionProgress.completed}/{brief.actionProgress.total} actions
          </span>
        )}
        {brief.source_url ? (
          <a href={brief.source_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-0.5 text-xs text-primary hover:underline shrink-0 w-20 text-right">
            {brief.source_name} <ExternalLink className="h-2.5 w-2.5" />
          </a>
        ) : (
          <span className="text-xs text-muted-foreground shrink-0 w-20 text-right">{brief.source_name}</span>
        )}
        <span className="text-xs text-muted-foreground shrink-0 w-24 text-right">
          {new Date(brief.created_at).toLocaleDateString()}
        </span>
        {relevance !== undefined && (
          <span className="text-xs text-primary font-medium shrink-0 w-12 text-right">
            {Math.round(relevance * 100)}%
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="text-left rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors flex flex-col h-full"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1 flex-wrap">
          <Badge className={cn("text-[10px] shrink-0", badge.className)}>{badge.label}</Badge>
          {isSample && (
            <Badge variant="outline" className="text-[9px] shrink-0 text-muted-foreground border-muted-foreground/30">SAMPLE</Badge>
          )}
          {brief.actioned_at && (
            <Badge className="text-[10px] shrink-0 bg-green-100 text-green-800 border-green-300 gap-0.5">
              <CheckCircle2 className="h-3 w-3" /> Actioned
            </Badge>
          )}
        </div>
        {relevance !== undefined && (
          <span className="text-[10px] text-primary font-semibold">{Math.round(relevance * 100)}%</span>
        )}
      </div>
      <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2">{brief.title}</h3>
      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 flex-1">
        {brief.summary || "No summary available"}
      </p>
      <div className="mt-3 flex items-center justify-between gap-2">
        {brief.source_url ? (
          <a href={brief.source_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-0.5 text-[11px] text-primary hover:underline">
            {brief.source_name} <ExternalLink className="h-2.5 w-2.5" />
          </a>
        ) : (
          <span className="text-[11px] text-muted-foreground">{brief.source_name}</span>
        )}
        <div className="flex items-center gap-2">
          {brief.actionProgress && brief.actionProgress.total > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {brief.actionProgress.completed}/{brief.actionProgress.total} actions
            </span>
          )}
          <span className="text-[11px] text-muted-foreground">
            {new Date(brief.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>
      {tags.filter(t => t !== "sample").length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {tags.filter(t => t !== "sample").slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
          {tags.filter(t => t !== "sample").length > 3 && (
            <span className="text-[10px] text-muted-foreground">+{tags.length - 3}</span>
          )}
        </div>
      )}
    </button>
  );
}
