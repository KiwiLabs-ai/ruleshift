import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizationId } from "./use-dashboard-data";

export function useProfileData() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useOrganizationData() {
  const { data: orgId } = useOrganizationId();
  return useQuery({
    queryKey: ["organization", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", orgId!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useNotificationPrefs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notification-prefs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: { full_name?: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}

export function useUpdateOrganization() {
  const { data: orgId } = useOrganizationId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: { name?: string; industry?: string; company_size?: string; compliance_concern?: string }) => {
      const { error } = await supabase
        .from("organizations")
        .update(updates)
        .eq("id", orgId!);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["organization"] }),
  });
}

export function useUpdateNotificationPrefs() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: {
      email_enabled?: boolean;
      slack_enabled?: boolean;
      slack_webhook_url?: string | null;
      digest_frequency?: string;
      preferred_time?: string;
      preferred_day?: string | null;
      severity_threshold?: string;
    }) => {
      // Upsert
      const { data: existing } = await supabase
        .from("notification_preferences")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("notification_preferences")
          .update(updates)
          .eq("user_id", user!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("notification_preferences")
          .insert({ user_id: user!.id, ...updates });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notification-prefs"] }),
  });
}

export function useSubscriptionStatus() {
  return useQuery({
    queryKey: ["subscription-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;
      return data as {
        subscribed: boolean;
        product_id: string | null;
        price_id: string | null;
        subscription_end: string | null;
        status: string;
      };
    },
    refetchInterval: 60000,
  });
}

export function useAuditLog(orgId: string | null | undefined) {
  return useQuery({
    queryKey: ["audit-log", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}
