import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WeekBucket {
  week: string; // ISO date string for the start of the week
  label: string; // e.g. "Mar 2"
  critical: number;
  important: number;
  informational: number;
}

export function useActivityChart(orgId: string | null | undefined) {
  return useQuery({
    queryKey: ["activity-chart", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const eightWeeksAgo = new Date();
      eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

      const { data, error } = await supabase
        .from("alerts")
        .select("created_at, severity")
        .eq("organization_id", orgId!)
        .gte("created_at", eightWeeksAgo.toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Build 8 week buckets
      const buckets: WeekBucket[] = [];
      const now = new Date();
      for (let i = 7; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - i * 7);
        // Align to Monday
        const day = weekStart.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        weekStart.setDate(weekStart.getDate() + diff);
        weekStart.setHours(0, 0, 0, 0);

        buckets.push({
          week: weekStart.toISOString(),
          label: weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          critical: 0,
          important: 0,
          informational: 0,
        });
      }

      // Assign alerts to buckets
      for (const alert of data ?? []) {
        const alertDate = new Date(alert.created_at);
        // Find the right bucket (last bucket whose week <= alertDate)
        for (let i = buckets.length - 1; i >= 0; i--) {
          if (alertDate >= new Date(buckets[i].week)) {
            const sev = alert.severity;
            if (sev === "critical" || sev === "important" || sev === "informational") {
              buckets[i][sev]++;
            } else {
              buckets[i].informational++;
            }
            break;
          }
        }
      }

      return buckets;
    },
  });
}
