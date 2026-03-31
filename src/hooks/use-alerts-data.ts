import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganizationId } from "./use-dashboard-data";

export type SeverityFilter = "all" | "critical" | "important" | "informational";
export type StatusFilter = "all" | "unread" | "read" | "actioned";
export type DateRange = "today" | "week" | "month" | "all" | "custom";

export interface AlertsFilters {
  severity: SeverityFilter;
  status: StatusFilter;
  source: string;
  dateRange: DateRange;
  customFrom?: Date;
  customTo?: Date;
  search: string;
}

export const defaultFilters: AlertsFilters = {
  severity: "all",
  status: "all",
  source: "all",
  dateRange: "all",
  search: "",
};

export function useAlertsPage() {
  const { data: orgId, isLoading: orgLoading } = useOrganizationId();
  const [filters, setFilters] = useState<AlertsFilters>(defaultFilters);
  const [limit, setLimit] = useState(20);
  const queryClient = useQueryClient();

  const alertsQuery = useQuery({
    queryKey: ["alerts-page", orgId, filters, limit],
    enabled: !!orgId,
    queryFn: async () => {
      let query = supabase
        .from("alerts")
        .select("*, briefs(id, title, summary, content, source_name, actioned_at)", { count: "exact" })
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (filters.severity !== "all") {
        query = query.eq("severity", filters.severity);
      }
      if (filters.status === "unread") {
        query = query.eq("is_read", false);
      } else if (filters.status === "read") {
        query = query.eq("is_read", true);
      }
      // "actioned" filter is applied client-side after briefs join
      if (filters.source !== "all") {
        query = query.eq("source_name", filters.source);
      }

      // Date range
      const now = new Date();
      if (filters.dateRange === "today") {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        query = query.gte("created_at", start.toISOString());
      } else if (filters.dateRange === "week") {
        const start = new Date(now);
        start.setDate(start.getDate() - 7);
        query = query.gte("created_at", start.toISOString());
      } else if (filters.dateRange === "month") {
        const start = new Date(now);
        start.setMonth(start.getMonth() - 1);
        query = query.gte("created_at", start.toISOString());
      } else if (filters.dateRange === "custom" && filters.customFrom) {
        query = query.gte("created_at", filters.customFrom.toISOString());
        if (filters.customTo) {
          const end = new Date(filters.customTo);
          end.setHours(23, 59, 59, 999);
          query = query.lte("created_at", end.toISOString());
        }
      }

      if (filters.search) {
        query = query.ilike("title", `%${filters.search}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      let results = data ?? [];

      // Client-side actioned filter
      if (filters.status === "actioned") {
        results = results.filter((a: any) => a.briefs?.actioned_at);
      }

      return { alerts: results, total: filters.status === "actioned" ? results.length : (count ?? 0) };
    },
  });

  const sourcesQuery = useQuery({
    queryKey: ["alert-sources", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("source_name")
        .eq("organization_id", orgId!);
      if (error) throw error;
      const unique = [...new Set(data.map((d) => d.source_name))];
      return unique;
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from("alerts")
        .update({ is_read: true })
        .eq("id", alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts-page"] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      if (!orgId) return;
      const { error } = await supabase
        .from("alerts")
        .update({ is_read: true })
        .eq("organization_id", orgId)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts-page"] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });

  // Realtime
  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel("alerts-page-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alerts", filter: `organization_id=eq.${orgId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["alerts-page"] });
          queryClient.invalidateQueries({ queryKey: ["alerts"] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId, queryClient]);

  return {
    orgId,
    orgLoading,
    filters,
    setFilters,
    alerts: alertsQuery.data?.alerts ?? [],
    total: alertsQuery.data?.total ?? 0,
    isLoading: alertsQuery.isLoading || orgLoading,
    sources: sourcesQuery.data ?? [],
    markRead: markReadMutation.mutate,
    markAllRead: markAllReadMutation.mutate,
    loadMore: () => setLimit((l) => l + 20),
    limit,
  };
}

export function useBriefDetail(briefId: string | undefined) {
  return useQuery({
    queryKey: ["brief-detail", briefId],
    enabled: !!briefId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("briefs")
        .select("*, alerts(id, severity, is_read, source_name, org_source_id)")
        .eq("id", briefId!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}
