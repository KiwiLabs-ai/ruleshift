import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ChevronDown, ChevronRight, Globe, ExternalLink, Trash2, RefreshCw, RotateCcw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { dot: string; label: string }> = {
  active: { dot: "bg-green-500", label: "Active" },
  paused: { dot: "bg-yellow-500", label: "Paused" },
  error: { dot: "bg-destructive", label: "Error" },
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

interface SourcesTableProps {
  watchlist: WatchlistItem[];
  onRemove: (id: string) => void;
  onCheck: (id: string) => void;
  onRetry: (id: string) => void;
  checkingSourceId: string | null;
}

export function SourcesTable({ watchlist, onRemove, onCheck, onRetry, checkingSourceId }: SourcesTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Source</TableHead>
            <TableHead className="hidden md:table-cell">Category</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden lg:table-cell">Last Checked</TableHead>
            <TableHead className="hidden lg:table-cell">Last Changed</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {watchlist.map((item) => {
            const name = item.custom_name || item.sources?.name || "Unnamed";
            const category = item.sources?.source_categories?.name || (item.is_custom ? "Custom" : "—");
            const url = item.custom_url || item.sources?.url;
            const status = statusConfig[item.status] ?? statusConfig.active;
            const isExpanded = expandedId === item.id;
            const isChecking = checkingSourceId === item.id;
            const isError = item.status === "error";
            const hasWarning = !isError && item.consecutive_errors > 0 && item.consecutive_errors < 5;

            return (
              <>
                <TableRow
                  key={item.id}
                  className={cn(
                    "cursor-pointer hover:bg-accent/50",
                    isError && "bg-destructive/5",
                    hasWarning && "bg-amber-500/5"
                  )}
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  <TableCell className="w-8 pr-0">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-0">
                      <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{name}</p>
                        {url && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">{url}</p>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-sm break-all text-xs">
                              {url}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-xs text-muted-foreground">{category}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className={cn("h-2 w-2 rounded-full", status.dot)} />
                      <span className="text-xs">{status.label}</span>
                      {hasWarning && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 ml-1" />
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs text-xs">
                            <p className="font-medium text-amber-500 mb-1">
                              {item.consecutive_errors} consecutive error{item.consecutive_errors > 1 ? "s" : ""}
                            </p>
                            {item.last_error && <p className="text-muted-foreground">{item.last_error}</p>}
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {isError && item.last_error && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-[10px] text-destructive truncate max-w-[120px] ml-1 cursor-help">
                              {item.last_error}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-sm text-xs break-words">
                            {item.last_error}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {item.last_checked_at
                        ? formatDistanceToNow(new Date(item.last_checked_at), { addSuffix: true })
                        : "Never"}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {item.last_changed_at
                        ? formatDistanceToNow(new Date(item.last_changed_at), { addSuffix: true })
                        : "No changes"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      {isError ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-amber-500 hover:text-amber-600"
                              disabled={isChecking}
                              onClick={() => onRetry(item.id)}
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
                              className="h-8 w-8"
                              disabled={isChecking}
                              onClick={() => onCheck(item.id)}
                            >
                              <RefreshCw className={cn("h-3.5 w-3.5", isChecking && "animate-spin")} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Check Now</TooltipContent>
                        </Tooltip>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
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
                  </TableCell>
                </TableRow>

                {isExpanded && (
                  <TableRow key={`${item.id}-detail`}>
                    <TableCell colSpan={7} className="bg-muted/30 px-8 py-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Details</p>
                          <dl className="space-y-1 text-sm">
                            <div className="flex gap-2">
                              <dt className="text-muted-foreground w-24 shrink-0">Name:</dt>
                              <dd>{name}</dd>
                            </div>
                            {url && (
                              <div className="flex gap-2">
                                <dt className="text-muted-foreground w-24 shrink-0">URL:</dt>
                                <dd>
                                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                                    {url} <ExternalLink className="h-3 w-3" />
                                  </a>
                                </dd>
                              </div>
                            )}
                            {item.custom_selector && (
                              <div className="flex gap-2">
                                <dt className="text-muted-foreground w-24 shrink-0">Selector:</dt>
                                <dd><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{item.custom_selector}</code></dd>
                              </div>
                            )}
                            <div className="flex gap-2">
                              <dt className="text-muted-foreground w-24 shrink-0">Type:</dt>
                              <dd>{item.is_custom ? "Custom" : "Library"}</dd>
                            </div>
                          </dl>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                            {isError ? "Error Details" : "Recent Changes"}
                          </p>
                          {isError && item.last_error ? (
                            <div className="space-y-2">
                              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
                                <p className="text-sm text-destructive font-medium mb-1">Source is unreachable</p>
                                <p className="text-xs text-muted-foreground">{item.last_error}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Failed {item.consecutive_errors} consecutive time{item.consecutive_errors > 1 ? "s" : ""}
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
                                disabled={isChecking}
                                onClick={(e) => { e.stopPropagation(); onRetry(item.id); }}
                              >
                                <RotateCcw className={cn("h-3.5 w-3.5 mr-1.5", isChecking && "animate-spin")} />
                                {isChecking ? "Retrying…" : "Reset & Retry"}
                              </Button>
                            </div>
                          ) : hasWarning && item.last_error ? (
                            <div className="space-y-1">
                              <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-3">
                                <p className="text-sm text-amber-600 font-medium mb-1">
                                  Intermittent errors ({item.consecutive_errors}/5)
                                </p>
                                <p className="text-xs text-muted-foreground">{item.last_error}</p>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Source will be marked as error after 5 consecutive failures.
                              </p>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              {item.last_changed_at
                                ? `Last change detected ${formatDistanceToNow(new Date(item.last_changed_at), { addSuffix: true })}`
                                : "No changes detected yet for this source."}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
