import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

export type Alert = Database["public"]["Tables"]["alerts"]["Row"];
export type ActivityEvent = Database["public"]["Tables"]["activity_events"]["Row"];

export interface ActiveSource {
  id: string;
  custom_name: string | null;
  source_id: string | null;
  is_custom: boolean;
  last_checked_at: string | null;
  status: string;
  policy_sources: { name: string } | null;
}

export function useOrganizationId() {
  const { user } = useAuth();
  return useQuery<string | null>({
    queryKey: ["organization-id", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data?.organization_id ?? null;
    },
  });
}

export function useActiveSources(orgId: string | null | undefined) {
  return useQuery<ActiveSource[]>({
    queryKey: ["active-sources", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_sources")
        .select("id, custom_name, source_id, is_custom, last_checked_at, status, policy_sources(name)")
        .eq("organization_id", orgId!);
      if (error) throw error;
      return (data as unknown as ActiveSource[]) ?? [];
    },
  });
}

export function useAlerts(orgId: string | null | undefined) {
  return useQuery<Alert[]>({
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
      return (data as Alert[]) ?? [];
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
  return useQuery<ActivityEvent[]>({
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
      return (data as ActivityEvent[]) ?? [];
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
