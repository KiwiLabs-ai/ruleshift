import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { Activity, FileText, Mail, Radar } from "lucide-react";

interface Event {
  id: string;
  event_type: string;
  description: string;
  created_at: string;
}

const eventConfig: Record<string, { icon: typeof Activity; bg: string; text: string }> = {
  change_detected: { icon: Radar, bg: "bg-secondary/10", text: "text-secondary" },
  brief_generated: { icon: FileText, bg: "bg-primary/10", text: "text-primary" },
  digest_sent: { icon: Mail, bg: "bg-green-500/10", text: "text-green-600" },
};

const defaultConfig = { icon: Activity, bg: "bg-muted", text: "text-muted-foreground" };

export function ActivityTimeline({ events, loading }: { events: Event[]; loading?: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full mb-2" />)
        ) : events.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <div className="space-y-0">
            {events.map((e, i) => {
              const config = eventConfig[e.event_type] ?? defaultConfig;
              const Icon = config.icon;
              return (
                <div key={e.id} className="flex gap-3 py-2">
                  <div className="flex flex-col items-center">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${config.bg}`}>
                      <Icon className={`h-4 w-4 ${config.text}`} />
                    </div>
                    {i < events.length - 1 && (
                      <div className="w-px flex-1 mt-1 bg-gradient-to-b from-border to-transparent" />
                    )}
                  </div>
                  <div className="pb-2 flex-1">
                    <p className="text-sm text-foreground">{e.description}</p>
                    <span className="inline-block mt-1 bg-muted px-2 py-0.5 rounded-full text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
