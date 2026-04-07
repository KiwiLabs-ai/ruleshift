import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Radar, ArrowUpRight, LayoutGrid, List, RefreshCw, Sparkles } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ToastAction } from "@/components/ui/toast";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SourcesTable } from "@/components/sources/SourcesTable";
import { SourceCardGrid } from "@/components/sources/SourceCardGrid";
import { AddSourceModal } from "@/components/sources/AddSourceModal";
import { useSourcesData } from "@/hooks/use-sources-data";
import { useOrganizationId } from "@/hooks/use-dashboard-data";
import { useToast } from "@/hooks/use-toast";

type SortOption = "name" | "recent" | "status" | "last_checked";
type StatusFilter = "all" | "active" | "error" | "pending";

const getSourceName = (item: any): string =>
  item.custom_name || item.sources?.name || "Unnamed";

const SourcesPage = () => {
  const {
    watchlist,
    isLoading,
    catalogSources,
    catalogLoading,
    categories,
    templates,
    templatesLoading,
    sourceCount,
    sourceLimit,
    atLimit,
    addSources,
    removeSource,
    addCustomSource,
    applyTemplate,
    isAdding,
    isApplyingTemplate,
    checkSource,
    checkAllSources,
    resetSourceStatus,
    checkingSourceId,
    isCheckingSource,
    isCheckingAll,
  } = useSourcesData();

  const { data: orgId } = useOrganizationId();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [addOpen, setAddOpen] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const isCheckInFlight = isCheckingSource || isCheckingAll;

  const filteredSortedWatchlist = useMemo(() => {
    const filtered =
      statusFilter === "all"
        ? watchlist
        : watchlist.filter((item: any) => item.status === statusFilter);

    const sorted = [...filtered];
    switch (sortBy) {
      case "name":
        sorted.sort((a: any, b: any) =>
          getSourceName(a).localeCompare(getSourceName(b))
        );
        break;
      case "recent":
        sorted.sort(
          (a: any, b: any) =>
            new Date(b.added_at ?? 0).getTime() -
            new Date(a.added_at ?? 0).getTime()
        );
        break;
      case "status":
        sorted.sort((a: any, b: any) =>
          (a.status ?? "").localeCompare(b.status ?? "")
        );
        break;
      case "last_checked":
        sorted.sort(
          (a: any, b: any) =>
            new Date(b.last_checked_at ?? 0).getTime() -
            new Date(a.last_checked_at ?? 0).getTime()
        );
        break;
    }
    return sorted;
  }, [watchlist, statusFilter, sortBy]);

  const handleRemove = async (id: string) => {
    try {
      await removeSource(id);
      toast({ title: "Source removed" });
    } catch {
      toast({ title: "Error", description: "Failed to remove source.", variant: "destructive" });
    }
  };

  const handleCheckSource = async (sourceId: string) => {
    if (!orgId) return;
    try {
      const result = await checkSource({ sourceId, orgId });
      if (result?.changes_detected > 0) {
        toast({
          title: "Change detected — brief generated",
          description: "Open the Alerts page to read the new brief.",
          action: (
            <ToastAction altText="View alerts" onClick={() => navigate("/alerts")}>
              View alerts
            </ToastAction>
          ),
        });
      } else {
        toast({ title: "No changes detected" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to check source.", variant: "destructive" });
    }
  };

  const handleCheckAll = async () => {
    if (!orgId) return;
    try {
      const result = await checkAllSources({ orgId, batchSize: 100 });
      const checked = result?.processed ?? result?.sources_checked ?? 0;
      const changes = result?.changes_detected ?? 0;
      toast({
        title: `Checked ${checked} sources — ${changes} change${changes === 1 ? "" : "s"} detected`,
        description: changes > 0 ? "Briefs are being generated. Check the Alerts page." : undefined,
        action:
          changes > 0 ? (
            <ToastAction altText="View alerts" onClick={() => navigate("/alerts")}>
              View alerts
            </ToastAction>
          ) : undefined,
      });
    } catch {
      toast({ title: "Error", description: "Failed to check sources.", variant: "destructive" });
    }
  };

  const handleRetry = async (sourceId: string) => {
    if (!orgId) return;
    try {
      await resetSourceStatus(sourceId);
      await handleCheckSource(sourceId);
    } catch {
      toast({ title: "Error", description: "Failed to retry source.", variant: "destructive" });
    }
  };

  const usagePercent = sourceLimit === Infinity ? 0 : Math.round((sourceCount / sourceLimit) * 100);
  const activeCount = watchlist.filter((w) => w.status === "active").length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Sources</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-secondary" />
              {activeCount} sources active
            </p>
          </div>
          <div className="flex items-center gap-2">
            {watchlist.length > 0 && (
              <Button variant="outline" onClick={handleCheckAll} disabled={isCheckInFlight || !orgId}>
                <RefreshCw className={`h-4 w-4 mr-1 ${isCheckingAll ? "animate-spin" : ""}`} />
                {isCheckingAll ? "Checking…" : "Check All Sources"}
              </Button>
            )}
            {/* View toggle */}
            <div className="flex items-center rounded-lg border border-border p-0.5">
              <button
                onClick={() => setView("grid")}
                className={`rounded-md p-1.5 transition-colors ${view === "grid" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView("list")}
                className={`rounded-md p-1.5 transition-colors ${view === "list" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            <Button onClick={() => setAddOpen(true)} disabled={atLimit}>
              <Plus className="h-4 w-4 mr-1" /> Add Source
            </Button>
          </div>
        </div>

        {/* Usage bar */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              {sourceCount} of {sourceLimit === Infinity ? "∞" : sourceLimit} sources used
            </span>
            {atLimit && (
              <Button variant="link" size="sm" className="gap-1 h-auto p-0 text-xs" asChild>
                <a href="/settings?tab=billing">
                  Upgrade to add more <ArrowUpRight className="h-3 w-3" />
                </a>
              </Button>
            )}
          </div>
          {sourceLimit !== Infinity && (
            <Progress value={usagePercent} className="h-2" />
          )}
        </div>

        {/* Upgrade prompt when at limit */}
        {atLimit && (
          <div className="rounded-xl border border-secondary/20 bg-gradient-to-r from-secondary/5 via-secondary/10 to-secondary/5 backdrop-blur-sm px-5 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/15">
                <Sparkles className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  You've reached the {sourceLimit}-source limit on your current plan.
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Upgrade to Pro for up to 25 sources, or Enterprise for unlimited.
                </p>
              </div>
            </div>
            <Button size="sm" className="shrink-0 gap-1.5 bg-secondary text-secondary-foreground hover:bg-teal-light" asChild>
              <a href="/settings?tab=billing">
                Upgrade <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        )}

        {/* Sort + filter controls */}
        {!isLoading && watchlist.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Sort: Name</SelectItem>
                <SelectItem value="recent">Sort: Recently Added</SelectItem>
                <SelectItem value="status">Sort: Status</SelectItem>
                <SelectItem value="last_checked">Sort: Last Checked</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as StatusFilter)}
            >
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : watchlist.length === 0 ? (
          <EmptyState
            icon={Radar}
            title="No sources yet"
            description="Add policy sources to start monitoring for changes that affect your business."
            action={{ label: "Add Your First Source", onClick: () => setAddOpen(true) }}
          />
        ) : filteredSortedWatchlist.length === 0 ? (
          <EmptyState
            icon={Radar}
            title="No sources match your filters"
            description="Try adjusting the status filter to see more sources."
          />
        ) : view === "grid" ? (
          <SourceCardGrid
            watchlist={filteredSortedWatchlist}
            onRemove={handleRemove}
            onAddClick={() => setAddOpen(true)}
            onCheck={handleCheckSource}
            onRetry={handleRetry}
            checkingSourceId={isCheckInFlight ? checkingSourceId : null}
          />
        ) : (
          <SourcesTable
            watchlist={filteredSortedWatchlist}
            onRemove={handleRemove}
            onCheck={handleCheckSource}
            onRetry={handleRetry}
            checkingSourceId={isCheckInFlight ? checkingSourceId : null}
          />
        )}
      </div>

      <AddSourceModal
        open={addOpen}
        onOpenChange={setAddOpen}
        catalogSources={catalogSources}
        catalogLoading={catalogLoading}
        categories={categories}
        templates={templates}
        templatesLoading={templatesLoading}
        atLimit={atLimit}
        onAddSources={addSources}
        onAddCustom={addCustomSource}
        onApplyTemplate={applyTemplate}
        isAdding={isAdding}
        isApplyingTemplate={isApplyingTemplate}
      />
    </DashboardLayout>
  );
};

export default SourcesPage;
