import { Bell, SearchX } from "lucide-react";

export function AlertsEmptyState({ filtered }: { filtered: boolean }) {
  if (filtered) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <SearchX className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold text-foreground">No matching alerts</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          No alerts match your current filters. Try adjusting your criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <h3 className="text-lg font-semibold text-foreground">No policy changes detected yet</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
        Your monitoring is active — we'll alert you when something changes.
      </p>
    </div>
  );
}
