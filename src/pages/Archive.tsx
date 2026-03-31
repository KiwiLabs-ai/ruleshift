import { useState } from "react";
import { Search, LayoutGrid, List, Download, BarChart3, Archive } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArchiveFilterSidebar } from "@/components/archive/ArchiveFilterSidebar";
import { ArchiveBriefCard } from "@/components/archive/ArchiveBriefCard";
import { TrendView } from "@/components/archive/TrendView";
import { useArchiveData } from "@/hooks/use-archive-data";

const ArchivePage = () => {
  const {
    briefs,
    isLoading,
    filters,
    setFilters,
    searchQuery,
    setSearchQuery,
    isSearching,
    viewMode,
    setViewMode,
    sources,
    tags,
    trendData,
  } = useArchiveData();

  const [searchInput, setSearchInput] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearchQuery("");
  };

  const handleExportCSV = () => {
    if (briefs.length === 0) return;
    const headers = ["Title", "Source", "Severity", "Date", "Summary", "Tags"];
    const rows = briefs.map((b: any) => {
      const alert = Array.isArray(b.alerts) ? b.alerts?.[0] : b.alerts;
      return [
        `"${(b.title ?? "").replace(/"/g, '""')}"`,
        b.source_name,
        alert?.severity ?? "informational",
        new Date(b.created_at).toLocaleDateString(),
        `"${(b.summary ?? "").replace(/"/g, '""')}"`,
        `"${(b.tags ?? []).join(", ")}"`,
      ].join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compliance-archive-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Briefs Archive</h1>
            <p className="text-sm text-muted-foreground">
              Search and browse all past impact briefs
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportCSV}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search your compliance archive..."
            className="pl-11 h-12 text-base"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {isSearching && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
              onClick={handleClearSearch}
            >
              Clear
            </Button>
          )}
        </form>

        <Tabs defaultValue="browse">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="browse" className="gap-1.5">
                <Archive className="h-4 w-4" /> Browse
              </TabsTrigger>
              <TabsTrigger value="trends" className="gap-1.5">
                <BarChart3 className="h-4 w-4" /> Trends
              </TabsTrigger>
            </TabsList>

            <div className="flex gap-1">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <TabsContent value="browse" className="mt-4">
            <div className="flex gap-6">
              {/* Filter sidebar */}
              <div className="hidden md:block w-56 shrink-0">
                <ArchiveFilterSidebar
                  filters={filters}
                  onChange={setFilters}
                  sources={sources}
                  tags={tags}
                />
              </div>

              {/* Results */}
              <div className="flex-1 min-w-0">
                {isLoading ? (
                  <div className={viewMode === "grid" ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3" : "space-y-2"}>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className={viewMode === "grid" ? "h-44 rounded-lg" : "h-16 rounded-lg"} />
                    ))}
                  </div>
                ) : briefs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Archive className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold text-foreground">
                      {isSearching ? "No results found" : "No briefs yet"}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                      {isSearching
                        ? "Try adjusting your search query or filters."
                        : "Impact briefs will appear here as policy changes are detected."}
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground mb-3">
                      {briefs.length} brief{briefs.length !== 1 ? "s" : ""} found
                      {isSearching && " (ranked by relevance)"}
                    </p>
                    <div
                      className={
                        viewMode === "grid"
                          ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
                          : "space-y-2"
                      }
                    >
                      {briefs.map((brief: any) => (
                        <ArchiveBriefCard
                          key={brief.id}
                          brief={brief}
                          viewMode={viewMode}
                          relevance={isSearching ? brief.relevance : undefined}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="trends" className="mt-4">
            <TrendView data={trendData} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default ArchivePage;
