import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useOrganizationId() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["organization-id", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data?.organization_id ?? null) as string | null;
    },
  });
}

export function useActiveSources(orgId: string | null | undefined) {
  return useQuery({
    queryKey: ["active-sources", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_sources")
        .select("id, custom_name, source_id, is_custom, last_checked_at, status, policy_sources(name)")
        .eq("organization_id", orgId!);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAlerts(orgId: string | null | undefined) {
  return useQuery({
    queryKey: ["alerts", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useBriefsThisMonth(orgId: string | null | undefined) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  return useQuery({
    queryKey: ["briefs-month", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("briefs")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId!)
        .gte("created_at", startOfMonth.toISOString());
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useActivityEvents(orgId: string | null | undefined) {
  return useQuery({
    queryKey: ["activity-events", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_events")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRealtimeAlerts(orgId: string | null | undefined, refetch: () => void) {
  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel("alerts-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alerts", filter: `organization_id=eq.${orgId}` },
        () => refetch()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId, refetch]);
}
