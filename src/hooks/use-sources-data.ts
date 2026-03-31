import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganizationId } from "@/hooks/use-dashboard-data";

async function invokeManageSources(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("manage-sources", {
    body,
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export function useSourcesData() {
  const queryClient = useQueryClient();
  const { data: orgId } = useOrganizationId();

  const watchlistQuery = useQuery({
    queryKey: ["watchlist", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const data = await invokeManageSources({ action: "get_watchlist" });
      return { items: data.watchlist ?? [], sourceLimit: data.sourceLimit ?? 5 };
    },
  });

  const catalogQuery = useQuery({
    queryKey: ["source-catalog", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const data = await invokeManageSources({ action: "list_catalog" });
      return data.sources ?? [];
    },
  });

  const categoriesQuery = useQuery({
    queryKey: ["source-categories", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const data = await invokeManageSources({ action: "list_categories" });
      return data.categories ?? [];
    },
  });

  const templatesQuery = useQuery({
    queryKey: ["source-templates", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const data = await invokeManageSources({ action: "list_templates" });
      return data.templates ?? [];
    },
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["watchlist"] });
    queryClient.invalidateQueries({ queryKey: ["source-catalog"] });
    queryClient.invalidateQueries({ queryKey: ["active-sources"] });
  };

  const addSourcesMutation = useMutation({
    mutationFn: async (sourceIds: string[]) => {
      return invokeManageSources({ action: "add_sources", source_ids: sourceIds });
    },
    onSuccess: invalidateAll,
  });

  const removeSourceMutation = useMutation({
    mutationFn: async (sourceId: string) => {
      return invokeManageSources({ action: "remove_source", source_id: sourceId });
    },
    onSuccess: invalidateAll,
  });

  const addCustomSourceMutation = useMutation({
    mutationFn: async (source: { url: string; name: string; check_frequency_hours?: number }) => {
      return invokeManageSources({ action: "add_custom_source", ...source });
    },
    onSuccess: invalidateAll,
  });

  const applyTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      return invokeManageSources({ action: "apply_template", template_id: templateId });
    },
    onSuccess: invalidateAll,
  });

  const sourceCount = watchlistQuery.data?.items?.length ?? 0;
  const sourceLimit = watchlistQuery.data?.sourceLimit ?? 5;

  const checkSourceMutation = useMutation({
    mutationFn: async ({ sourceId, orgId }: { sourceId: string; orgId: string }) => {
      const { data, error } = await supabase.functions.invoke("monitor-sources", {
        body: { source_id: sourceId, org_id: orgId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: invalidateAll,
  });

  const checkAllSourcesMutation = useMutation({
    mutationFn: async ({ orgId, batchSize }: { orgId: string; batchSize?: number }) => {
      const { data, error } = await supabase.functions.invoke("monitor-sources", {
        body: { org_id: orgId, batch_size: batchSize ?? 100 },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: invalidateAll,
  });

  const resetSourceStatusMutation = useMutation({
    mutationFn: async (sourceId: string) => {
      const { error } = await supabase
        .from("organization_sources")
        .update({ status: "active", consecutive_errors: 0, last_error: null })
        .eq("id", sourceId);
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  return {
    // Watchlist
    watchlist: watchlistQuery.data?.items ?? [],
    isLoading: watchlistQuery.isLoading,
    // Catalog
    catalogSources: catalogQuery.data ?? [],
    catalogLoading: catalogQuery.isLoading,
    // Categories
    categories: categoriesQuery.data ?? [],
    // Templates
    templates: templatesQuery.data ?? [],
    templatesLoading: templatesQuery.isLoading,
    // Counts
    sourceCount,
    sourceLimit,
    atLimit: sourceCount >= sourceLimit,
    // Mutations
    addSources: addSourcesMutation.mutateAsync,
    removeSource: removeSourceMutation.mutateAsync,
    addCustomSource: addCustomSourceMutation.mutateAsync,
    applyTemplate: applyTemplateMutation.mutateAsync,
    isAdding: addSourcesMutation.isPending || addCustomSourceMutation.isPending,
    isRemoving: removeSourceMutation.isPending,
    isApplyingTemplate: applyTemplateMutation.isPending,
    // Check mutations
    checkSource: checkSourceMutation.mutateAsync,
    checkAllSources: checkAllSourcesMutation.mutateAsync,
    resetSourceStatus: resetSourceStatusMutation.mutateAsync,
    checkingSourceId: checkSourceMutation.variables?.sourceId ?? null,
    isCheckingSource: checkSourceMutation.isPending,
    isCheckingAll: checkAllSourcesMutation.isPending,
    isResetting: resetSourceStatusMutation.isPending,
  };
}
