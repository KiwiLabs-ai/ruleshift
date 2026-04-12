import { formatDistanceToNow } from "date-fns";
import { Globe, Plus, Trash2, RefreshCw, RotateCcw, AlertTriangle, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const statusDot: Record<string, string> = {
  active: "bg-green-500",
  paused: "bg-yellow-500",
  error: "bg-destructive",
};

interface WatchlistItem {
  id: string;
  is_active: boolean;
  added_at: string;
  is_custom: boolean;
  custom_name: string | null;
  custom_url: string | null;
  custom_selector: string | null;
  check_frequency: string;
  status: string;
  last_checked_at: string | null;
  last_changed_at: string | null;
  last_error: string | null;
  consecutive_errors: number;
  sources: {
    id: string;
    name: string;
    url: string | null;
    description: string | null;
    source_categories: { id: string; name: string };
  } | null;
}

interface Props {
  watchlist: WatchlistItem[];
  onRemove: (id: string) => void;
  onAddClick: () => void;
  onCheck: (id: string) => void;
  onRetry: (id: string) => void;
  checkingSourceId: string | null;
}

export function SourceCardGrid({ watchlist, onRemove, onAddClick, onCheck, onRetry, checkingSourceId }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {watchlist.map((item) => {
        const name = item.custom_name || item.sources?.name || "Unnamed";
        const sourceUrl = item.custom_url || item.sources?.url || null;
        const category = item.sources?.source_categories?.name || null;
        const dot = statusDot[item.status] ?? statusDot.active;
        const freq = item.check_frequency || "6h";
        const isChecking = checkingSourceId === item.id;
        const isError = item.status === "error";
        const hasWarning = !isError && item.consecutive_errors > 0 && item.consecutive_errors < 5;

        return (
          <Card
            key={item.id}
            className={cn(
              "group relative min-h-[140px] flex flex-col justify-between p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-px hover:border-secondary/30",
              isError && "border-destructive/40",
              hasWarning && "border-amber-500/30"
            )}
          >
            {/* Top */}
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm font-semibold truncate">{name}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {hasWarning && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-xs text-xs">
                        <p className="font-medium text-amber-500 mb-1">
                          {item.consecutive_errors} consecutive error{item.consecutive_errors > 1 ? "s" : ""}
                        </p>
                        {item.last_error && <p className="text-muted-foreground">{item.last_error}</p>}
                      </TooltipContent>
                    </Tooltip>
                  )}
                  <span className={cn("h-2.5 w-2.5 rounded-full", dot)} />
                </div>
              </div>

              {/* Category pill */}
              <div className="mt-2">
                {item.is_custom ? (
                  <span className="text-[10px] bg-secondary/10 text-secondary px-2 py-0.5 rounded-full">Custom</span>
                ) : category ? (
                  <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{category}</span>
                ) : null}
              </div>

              {/* Source URL */}
              {sourceUrl && (
                <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex items-center text-muted-foreground hover:text-primary transition-colors" title={sourceUrl}>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}

              {/* Error message for error status */}
              {isError && item.last_error && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="mt-2 text-[11px] text-destructive truncate cursor-help">
                      ⚠ {item.last_error}
                    </p>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-sm text-xs break-words">
                    {item.last_error}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* Bottom */}
            <div className="flex items-end justify-between mt-3">
              <div className="space-y-0.5">
                <p className="text-[11px] text-muted-foreground">
                  Last checked: {item.last_checked_at ? formatDistanceToNow(new Date(item.last_checked_at), { addSuffix: true }) : "Never"}
                </p>
                <p className="text-[11px] text-muted-foreground">Every {freq}</p>
              </div>

              <div className="flex items-center gap-0.5">
                {isError ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-amber-500 hover:text-amber-600"
                        disabled={isChecking}
                        onClick={(e) => { e.stopPropagation(); onRetry(item.id); }}
                      >
                        <RotateCcw className={cn("h-3.5 w-3.5", isChecking && "animate-spin")} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Reset & Retry</TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                        disabled={isChecking}
                        onClick={(e) => { e.stopPropagation(); onCheck(item.id); }}
                      >
                        <RefreshCw className={cn("h-3.5 w-3.5", isChecking && "animate-spin")} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Check Now</TooltipContent>
                  </Tooltip>
                )}

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove source?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will stop monitoring "{name}" and remove it from your watchlist.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onRemove(item.id)}>Remove</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </Card>
        );
      })}

      {/* Add Source card */}
      <button
        onClick={onAddClick}
        className="min-h-[140px] flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/60 text-muted-foreground transition-colors hover:border-secondary/50 hover:text-secondary cursor-pointer"
      >
        <Plus className="h-6 w-6" />
        <span className="text-sm font-medium">Add Source</span>
      </button>
    </div>
  );
}
