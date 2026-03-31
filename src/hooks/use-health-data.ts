import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useHealthData(orgId: string | null | undefined) {
  return useQuery({
    queryKey: ["monitoring-health", orgId],
    enabled: !!orgId,
    refetchInterval: 60_000,
    queryFn: async () => {
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // 1. All org sources
      const { data: sources } = await supabase
        .from("organization_sources")
        .select("id, status, last_checked_at, custom_name, is_custom, policy_sources(name)")
        .eq("organization_id", orgId!);

      const all = sources ?? [];
      if (all.length === 0) return null; // no sources → hide card

      const errored = all.filter((s: any) => s.status === "error");
      const active = all.filter((s: any) => s.status === "active");
      const delayed = active.filter(
        (s: any) => !s.last_checked_at || s.last_checked_at < sixHoursAgo
      );
      const healthy = active.filter(
        (s: any) => s.last_checked_at && s.last_checked_at >= sixHoursAgo
      );

      // 2. Alerts last 7 days + most recent
      const { count: alertCount7d } = await supabase
        .from("alerts")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId!)
        .gte("created_at", sevenDaysAgo);

      const { data: recentAlert } = await supabase
        .from("alerts")
        .select("created_at, source_name")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // 3. Briefs last 7 days + most recent
      const { count: briefCount7d } = await supabase
        .from("briefs")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId!)
        .gte("created_at", sevenDaysAgo);

      const { data: recentBrief } = await supabase
        .from("briefs")
        .select("created_at")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        totalSources: all.length,
        healthyCount: healthy.length,
        delayedCount: delayed.length,
        erroredCount: errored.length,
        alertCount7d: alertCount7d ?? 0,
        briefCount7d: briefCount7d ?? 0,
        recentAlert: recentAlert
          ? { createdAt: recentAlert.created_at, sourceName: recentAlert.source_name }
          : null,
        recentBrief: recentBrief ? { createdAt: recentBrief.created_at } : null,
      };
    },
  });
}
