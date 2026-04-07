import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ActionItem {
  id: string;
  brief_id: string;
  action_index: number;
  completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
}

export function useBriefActionItems(briefId: string | undefined, actionCount: number) {
  const queryClient = useQueryClient();
  const seeded = useRef(false);

  const query = useQuery({
    queryKey: ["brief-action-items", briefId],
    enabled: !!briefId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("brief_action_items")
        .select("*")
        .eq("brief_id", briefId!)
        .order("action_index", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ActionItem[];
    },
  });

  // Seed rows on first view if none exist
  useEffect(() => {
    if (!briefId || actionCount === 0 || seeded.current) return;
    if (query.isLoading || query.data === undefined) return;
    if (query.data.length > 0) return;
    seeded.current = true;

    const rows = Array.from({ length: actionCount }, (_, i) => ({
      brief_id: briefId,
      action_index: i,
      completed: false,
    }));

    (supabase as any)
      .from("brief_action_items")
      .insert(rows)
      .then(({ error }) => {
        if (!error) queryClient.invalidateQueries({ queryKey: ["brief-action-items", briefId] });
      });
  }, [briefId, actionCount, query.isLoading, query.data, queryClient]);

  const toggleMutation = useMutation({
    mutationFn: async ({ actionIndex, completed, userId }: { actionIndex: number; completed: boolean; userId: string }) => {
      const { error } = await (supabase as any)
        .from("brief_action_items")
        .update({
          completed,
          completed_at: completed ? new Date().toISOString() : null,
          completed_by: completed ? userId : null,
        } as any)
        .eq("brief_id", briefId!)
        .eq("action_index", actionIndex);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brief-action-items", briefId] });
    },
  });

  const completedSet = new Set(
    (query.data ?? []).filter((i) => i.completed).map((i) => i.action_index)
  );

  const itemMap = new Map(
    (query.data ?? []).map((i) => [i.action_index, i])
  );

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    completedSet,
    itemMap,
    toggle: toggleMutation.mutate,
    isToggling: toggleMutation.isPending,
  };
}
