import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiCall } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

interface WatchlistItem {
  id: string;
  is_custom: boolean;
  custom_name: string | null;
  custom_url: string | null;
  sources: {
    id: string;
    name: string;
    url: string;
  } | null;
}

interface SourceLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tierName: string;
  tierLimit: number;
  onProceed: () => void;
  onSourceCountChange?: (count: number) => void;
}

const SourceLimitDialog = ({
  open,
  onOpenChange,
  tierName,
  tierLimit,
  onProceed,
  onSourceCountChange,
}: SourceLimitDialogProps) => {
  const { toast } = useToast();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchWatchlist = useCallback(async () => {
    setLoading(true);
    const { data, error } = await apiCall("manage-sources", { action: "get_watchlist" });
    if (error) {
      toast({ variant: "destructive", title: "Could not load sources", description: error });
      setLoading(false);
      return;
    }
    const list: WatchlistItem[] = data?.watchlist ?? [];
    setItems(list);
    onSourceCountChange?.(list.length);
    setLoading(false);
  }, [toast, onSourceCountChange]);

  useEffect(() => {
    if (open) fetchWatchlist();
  }, [open, fetchWatchlist]);

  const handleRemove = async (item: WatchlistItem) => {
    const name = item.is_custom ? item.custom_name || item.custom_url : item.sources?.name;
    setRemovingId(item.id);
    const { error } = await apiCall("manage-sources", {
      action: "remove_source",
      source_id: item.id,
      source_name: name,
    });
    setRemovingId(null);
    if (error) {
      toast({ variant: "destructive", title: "Could not remove source", description: error });
      return;
    }
    await fetchWatchlist();
  };

  const count = items.length;
  const overBy = Math.max(count - tierLimit, 0);
  const withinLimit = count <= tierLimit;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Too many sources for {tierName}
          </DialogTitle>
          <DialogDescription>
            You've selected <strong>{count}</strong> sources, but the <strong>{tierName}</strong> plan
            allows up to <strong>{tierLimit}</strong>. Remove at least{" "}
            <strong>{overBy}</strong> source{overBy === 1 ? "" : "s"} to continue, or choose a
            higher-tier plan.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-secondary" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No sources to show.
            </p>
          ) : (
            <ScrollArea className="h-72 rounded-md border">
              <ul className="divide-y">
                {items.map((item) => {
                  const name = item.is_custom
                    ? item.custom_name || item.custom_url
                    : item.sources?.name;
                  const url = item.is_custom ? item.custom_url : item.sources?.url;
                  return (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 px-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {name || "Unnamed source"}
                        </p>
                        {url && (
                          <p className="truncate text-xs text-muted-foreground">{url}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={removingId === item.id}
                        onClick={() => handleRemove(item)}
                      >
                        {removingId === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="mr-1 h-4 w-4" /> Remove
                          </>
                        )}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Choose a higher plan
          </Button>
          <Button
            disabled={!withinLimit || loading}
            onClick={onProceed}
            className="bg-secondary text-secondary-foreground hover:bg-teal-light"
          >
            Continue with {tierName}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SourceLimitDialog;
