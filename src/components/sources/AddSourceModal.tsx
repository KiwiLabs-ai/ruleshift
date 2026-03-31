import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus, Globe, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface CatalogSource {
  id: string;
  name: string;
  url: string | null;
  description: string | null;
  is_watched: boolean;
  source_categories: { id: string; name: string };
}

interface Category {
  id: string;
  name: string;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  industry: string;
  source_ids: string[];
  source_count: number;
  key_sources: string[];
}

interface AddSourceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalogSources: CatalogSource[];
  catalogLoading: boolean;
  categories: Category[];
  templates: Template[];
  templatesLoading: boolean;
  atLimit: boolean;
  onAddSources: (sourceIds: string[]) => Promise<void>;
  onAddCustom: (source: { url: string; name: string; check_frequency_hours?: number }) => Promise<void>;
  onApplyTemplate: (templateId: string) => Promise<unknown>;
  isAdding: boolean;
  isApplyingTemplate: boolean;
}

export function AddSourceModal({
  open,
  onOpenChange,
  catalogSources,
  catalogLoading,
  categories,
  templates,
  templatesLoading,
  atLimit,
  onAddSources,
  onAddCustom,
  onApplyTemplate,
  isAdding,
  isApplyingTemplate,
}: AddSourceModalProps) {
  const { toast } = useToast();
  const [librarySearch, setLibrarySearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [customName, setCustomName] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [customFreqHours, setCustomFreqHours] = useState("24");

  const filteredSources = useMemo(() => {
    let sources = catalogSources;
    if (selectedCategory !== "all") {
      sources = sources.filter((s) => s.source_categories?.name === selectedCategory);
    }
    if (librarySearch) {
      const q = librarySearch.toLowerCase();
      sources = sources.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.source_categories?.name?.toLowerCase().includes(q)
      );
    }
    return sources;
  }, [catalogSources, selectedCategory, librarySearch]);

  const groupedSources = useMemo(() => {
    const groups: Record<string, CatalogSource[]> = {};
    for (const s of filteredSources) {
      const cat = s.source_categories?.name ?? "Other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(s);
    }
    return groups;
  }, [filteredSources]);

  const toggleSource = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAddLibrary = async () => {
    if (selectedIds.size === 0) return;
    try {
      await onAddSources(Array.from(selectedIds));
      toast({ title: "Sources added", description: `${selectedIds.size} source(s) added to your watchlist.` });
      setSelectedIds(new Set());
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to add sources.", variant: "destructive" });
    }
  };

  const handleAddCustom = async () => {
    if (!customName || !customUrl) return;
    try {
      await onAddCustom({
        url: customUrl,
        name: customName,
        check_frequency_hours: parseInt(customFreqHours, 10),
      });
      toast({ title: "Source added", description: `"${customName}" added to your watchlist.` });
      setCustomName("");
      setCustomUrl("");
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to add source.", variant: "destructive" });
    }
  };

  const handleApplyTemplate = async (templateId: string) => {
    try {
      const result = await onApplyTemplate(templateId);
      const added = (result as any)?.added ?? 0;
      toast({
        title: added > 0 ? "Template applied" : "Already up to date",
        description: added > 0 ? `${added} source(s) added to your watchlist.` : "All template sources are already in your watchlist.",
      });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to apply template.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add a Monitoring Source</DialogTitle>
          <DialogDescription>
            Browse the source catalog, apply a quick-start template, or add a custom URL.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="library">
          <TabsList className="w-full">
            <TabsTrigger value="templates" className="flex-1">Templates</TabsTrigger>
            <TabsTrigger value="library" className="flex-1">Source Catalog</TabsTrigger>
            <TabsTrigger value="custom" className="flex-1">Custom URL</TabsTrigger>
          </TabsList>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-3 mt-3">
            {templatesLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-lg" />
                ))}
              </div>
            ) : templates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No templates available yet.</p>
            ) : (
              <div className="space-y-2">
                {templates.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-lg border p-3 space-y-2 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-secondary shrink-0" />
                          <p className="text-sm font-semibold">{t.name}</p>
                        </div>
                        {t.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {t.source_count} sources · {t.industry}
                        </p>
                        {t.key_sources.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Includes: {t.key_sources.slice(0, 3).join(", ")}
                            {t.key_sources.length > 3 && ` +${t.key_sources.length - 3} more`}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApplyTemplate(t.id)}
                        disabled={isApplyingTemplate || atLimit}
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Library / Catalog Tab */}
          <TabsContent value="library" className="space-y-3 mt-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter sources..."
                  className="pl-9 h-9"
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {catalogLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="max-h-[40vh] overflow-y-auto space-y-4 pr-1">
                {Object.entries(groupedSources).map(([category, sources]) => (
                  <div key={category}>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                      {category}
                    </h4>
                    <div className="space-y-1">
                      {sources.map((source) => (
                        <label
                          key={source.id}
                          className={`flex items-center gap-2.5 rounded-md border p-2.5 cursor-pointer transition-colors ${
                            source.is_watched
                              ? "opacity-50 cursor-not-allowed bg-muted/50"
                              : selectedIds.has(source.id)
                              ? "border-primary bg-primary/5"
                              : "hover:bg-accent/50"
                          }`}
                        >
                          <Checkbox
                            checked={selectedIds.has(source.id) || source.is_watched}
                            disabled={source.is_watched}
                            onCheckedChange={() => !source.is_watched && toggleSource(source.id)}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">{source.name}</p>
                            {source.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">{source.description}</p>
                            )}
                          </div>
                          {source.is_watched && (
                            <span className="text-[10px] text-muted-foreground shrink-0">Added</span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                {Object.keys(groupedSources).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">No sources match your filter.</p>
                )}
              </div>
            )}

            <Button
              className="w-full"
              disabled={selectedIds.size === 0 || isAdding || atLimit}
              onClick={handleAddLibrary}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add {selectedIds.size} Source{selectedIds.size !== 1 ? "s" : ""}
            </Button>
          </TabsContent>

          {/* Custom URL Tab */}
          <TabsContent value="custom" className="space-y-4 mt-3">
            <div className="space-y-2">
              <Label>URL *</Label>
              <Input
                placeholder="https://example.com/terms-of-service"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Source Name *</Label>
              <Input
                placeholder="e.g. Acme Corp Terms of Service"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Check Frequency</Label>
              <Select value={customFreqHours} onValueChange={setCustomFreqHours}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">Every 6 hours</SelectItem>
                  <SelectItem value="12">Every 12 hours</SelectItem>
                  <SelectItem value="24">Every 24 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              disabled={!customName || !customUrl || isAdding || atLimit}
              onClick={handleAddCustom}
            >
              <Globe className="h-4 w-4 mr-1" /> Add Source
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
