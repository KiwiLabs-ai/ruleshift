import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DeadlineItem {
  briefId: string;
  title: string;
  sourceName: string;
  deadlineDate: string;
  createdAt: string;
}

export function useUpcomingDeadlines(orgId: string | null | undefined) {
  return useQuery({
    queryKey: ["upcoming-deadlines", orgId],
    enabled: !!orgId,
    refetchInterval: 5 * 60_000,
    queryFn: async (): Promise<DeadlineItem[]> => {
      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("briefs")
        .select("id, title, source_name, deadline_date, created_at")
        .eq("organization_id", orgId!)
        .not("deadline_date", "is", null)
        .gte("deadline_date", today)
        .order("deadline_date", { ascending: true })
        .limit(10);

      if (error) throw error;

      return (data ?? []).map((b) => ({
        briefId: b.id,
        title: b.title,
        sourceName: b.source_name,
        deadlineDate: b.deadline_date!,
        createdAt: b.created_at,
      }));
    },
  });
}

/** All deadlines (upcoming + overdue) for the full Deadlines page. */
export function useAllDeadlines(orgId: string | null | undefined) {
  return useQuery({
    queryKey: ["all-deadlines", orgId],
    enabled: !!orgId,
    refetchInterval: 5 * 60_000,
    queryFn: async (): Promise<DeadlineItem[]> => {
      const { data, error } = await supabase
        .from("briefs")
        .select("id, title, source_name, deadline_date, created_at")
        .eq("organization_id", orgId!)
        .not("deadline_date", "is", null)
        .order("deadline_date", { ascending: true });

      if (error) throw error;

      return (data ?? []).map((b) => ({
        briefId: b.id,
        title: b.title,
        sourceName: b.source_name,
        deadlineDate: b.deadline_date!,
        createdAt: b.created_at,
      }));
    },
  });
}
