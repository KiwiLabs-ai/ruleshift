import { useState } from "react";
import { Plus, Radar, ArrowUpRight, LayoutGrid, List, RefreshCw, Sparkles } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { SourcesTable } from "@/components/sources/SourcesTable";
import { SourceCardGrid } from "@/components/sources/SourceCardGrid";
import { AddSourceModal } from "@/components/sources/AddSourceModal";
import { useSourcesData } from "@/hooks/use-sources-data";
import { useOrganizationId } from "@/hooks/use-dashboard-data";
import { useToast } from "@/hooks/use-toast";

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
  const [addOpen, setAddOpen] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");

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
        toast({ title: "Change detected! Generating brief..." });
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
      toast({
        title: `Checked ${result?.sources_checked ?? 0} sources. ${result?.changes_detected ?? 0} changes detected.`,
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
              <Button variant="outline" onClick={handleCheckAll} disabled={isCheckingAll || !orgId}>
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

        {/* Content */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : watchlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Radar className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold text-foreground">No sources yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Add policy sources to start monitoring for changes that affect your business.
            </p>
            <Button className="mt-4" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Your First Source
            </Button>
          </div>
        ) : view === "grid" ? (
          <SourceCardGrid
            watchlist={watchlist}
            onRemove={handleRemove}
            onAddClick={() => setAddOpen(true)}
            onCheck={handleCheckSource}
            onRetry={handleRetry}
            checkingSourceId={isCheckingSource ? checkingSourceId : null}
          />
        ) : (
          <SourcesTable
            watchlist={watchlist}
            onRemove={handleRemove}
            onCheck={handleCheckSource}
            onRetry={handleRetry}
            checkingSourceId={isCheckingSource ? checkingSourceId : null}
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
