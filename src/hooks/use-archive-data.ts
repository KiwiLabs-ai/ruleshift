import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { apiCall } from "@/lib/api";
import { useOrganizationId } from "./use-dashboard-data";

export interface ArchiveFilters {
  severities: string[];
  sources: string[];
  tags: string[];
  dateFrom?: Date;
  dateTo?: Date;
  actioned?: "all" | "actioned" | "not_actioned";
}

export const defaultArchiveFilters: ArchiveFilters = {
  severities: [],
  sources: [],
  tags: [],
  actioned: "all",
};

export function useArchiveData() {
  const { data: orgId, isLoading: orgLoading } = useOrganizationId();
  const [filters, setFilters] = useState<ArchiveFilters>(defaultArchiveFilters);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // All briefs (no search)
  const briefsQuery = useQuery({
    queryKey: ["archive-briefs", orgId, filters],
    enabled: !!orgId && !searchQuery,
    queryFn: async () => {
      let query = supabase
        .from("briefs")
        .select("*, alerts(id, severity, is_read)")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });

      if (filters.dateFrom) {
        query = query.gte("created_at", filters.dateFrom.toISOString());
      }
      if (filters.dateTo) {
        const end = new Date(filters.dateTo);
        end.setHours(23, 59, 59, 999);
        query = query.lte("created_at", end.toISOString());
      }
      if (filters.sources.length > 0) {
        query = query.in("source_name", filters.sources);
      }
      if (filters.tags.length > 0) {
        query = query.overlaps("tags", filters.tags);
      }

      const { data, error } = await query;
      if (error) throw error;

      let results = data ?? [];

      // Client-side severity filter (severity is on alerts)
      if (filters.severities.length > 0) {
        results = results.filter((b: any) => {
          const alert = Array.isArray(b.alerts) ? b.alerts[0] : b.alerts;
          return alert && filters.severities.includes(alert.severity);
        });
      }

      // Client-side actioned filter
      if (filters.actioned === "actioned") {
        results = results.filter((b: any) => !!b.actioned_at);
      } else if (filters.actioned === "not_actioned") {
        results = results.filter((b: any) => !b.actioned_at);
      }

      return results;
    },
  });

  // Search via edge function
  const searchQuery2 = useQuery({
    queryKey: ["archive-search", orgId, searchQuery],
    enabled: !!orgId && !!searchQuery,
    queryFn: async () => {
      const { data, error } = await apiCall("search-briefs", { query: searchQuery, limit: 50 });
      if (error) throw new Error(error);
      return data?.results ?? [];
    },
  });

  // Get unique sources and tags for filter options
  const metaQuery = useQuery({
    queryKey: ["archive-meta", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("briefs")
        .select("source_name, tags")
        .eq("organization_id", orgId!);
      if (error) throw error;
      const sources = [...new Set(data.map((d) => d.source_name))];
      const tags = [...new Set(data.flatMap((d: any) => d.tags ?? []))];
      return { sources, tags };
    },
  });

  // Trend data
  const trendQuery = useQuery({
    queryKey: ["archive-trends", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("briefs")
        .select("created_at, source_name, alerts(severity)")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Action item progress per brief
  const actionProgressQuery = useQuery({
    queryKey: ["archive-action-progress", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("brief_action_items")
        .select("brief_id, completed")
        .order("brief_id");
      if (error) throw error;
      // Group by brief_id
      const map: Record<string, { total: number; completed: number }> = {};
      for (const row of data ?? []) {
        if (!map[row.brief_id]) map[row.brief_id] = { total: 0, completed: 0 };
        map[row.brief_id].total++;
        if (row.completed) map[row.brief_id].completed++;
      }
      return map;
    },
  });

  const isSearching = !!searchQuery;
  const rawBriefs = isSearching ? (searchQuery2.data ?? []) : (briefsQuery.data ?? []);
  const progressMap = actionProgressQuery.data ?? {};
  
  // Attach action progress to each brief
  const briefs = rawBriefs.map((b: any) => ({
    ...b,
    actionProgress: progressMap[b.id] ?? null,
  }));
  const isLoading = orgLoading || (isSearching ? searchQuery2.isLoading : briefsQuery.isLoading);

  return {
    orgId,
    briefs,
    isLoading,
    filters,
    setFilters,
    searchQuery,
    setSearchQuery,
    isSearching,
    viewMode,
    setViewMode,
    sources: metaQuery.data?.sources ?? [],
    tags: metaQuery.data?.tags ?? [],
    trendData: trendQuery.data ?? [],
  };
}
