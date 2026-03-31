import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

interface Source {
  id: string;
  custom_name: string | null;
  is_custom: boolean;
  last_checked_at: string | null;
  status: string;
  policy_sources: { name: string } | null;
}

export function MonitoringStatus({ sources, loading }: { sources: Source[]; loading?: boolean }) {
  const display = sources.slice(0, 5);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Source Monitoring Status</CardTitle>
        <Link to="/sources" className="text-xs font-medium text-primary hover:underline">View All Sources</Link>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full mb-2" />)
        ) : display.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No sources configured yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Last Checked</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {display.map((s) => {
                  const name = s.is_custom ? s.custom_name : (s.policy_sources as any)?.name ?? "Unknown";
                  const isActive = s.status === "active";
                  return (
                    <tr key={s.id} className="border-b border-border last:border-0">
                      <td className="py-2.5 font-medium text-foreground">{name}</td>
                      <td className="py-2.5 text-muted-foreground">
                        {s.last_checked_at ? formatDistanceToNow(new Date(s.last_checked_at), { addSuffix: true }) : "—"}
                      </td>
                      <td className="py-2.5">
                        <span className="flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${isActive ? "bg-green-500" : "bg-destructive"}`} />
                          <span className="text-xs capitalize">{s.status}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
