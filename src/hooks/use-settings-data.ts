import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { apiCall } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useOrganizationId } from "./use-dashboard-data";

export function useProfileData() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // maybeSingle: for a freshly-created user the trigger-created
      // profile row may not exist yet; .single() would throw PGRST116
      // and push the query into error state.
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
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
        .maybeSingle();
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

function buildMutationErrorHandler(toast: ReturnType<typeof useToast>["toast"], label: string) {
  return (err: unknown) => {
    const message = err instanceof Error ? err.message : "Please try again.";
    console.error(`[settings] ${label} failed:`, err);
    toast({
      title: `Couldn't ${label}`,
      description: message,
      variant: "destructive",
    });
  };
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (updates: { full_name?: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast({ title: "Profile updated" });
    },
    onError: buildMutationErrorHandler(toast, "update profile"),
  });
}

export function useUpdateOrganization() {
  const { data: orgId } = useOrganizationId();
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (updates: { name?: string; industry?: string; company_size?: string; compliance_concern?: string }) => {
      const { error } = await supabase
        .from("organizations")
        .update(updates)
        .eq("id", orgId!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["organization"] });
      toast({ title: "Organization updated" });
    },
    onError: buildMutationErrorHandler(toast, "update organization"),
  });
}

export function useUpdateNotificationPrefs() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification-prefs"] });
      toast({ title: "Notification preferences saved" });
    },
    onError: buildMutationErrorHandler(toast, "save notification preferences"),
  });
}

export function useSubscriptionStatus() {
  return useQuery({
    queryKey: ["subscription-status"],
    queryFn: async () => {
      const { data, error } = await apiCall("check-subscription");
      if (error) throw new Error(error);
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
