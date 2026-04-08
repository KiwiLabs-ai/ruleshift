import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
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
      .then(({ error }: { error: unknown }) => {
        if (error) {
          // If seeding fails (e.g. RLS denial, network hiccup) the user sees
          // an empty checklist. Reset the ref so the next render can retry,
          // and log the cause instead of swallowing it silently.
          seeded.current = false;
          console.error("[brief-actions] seed insert failed:", error);
          return;
        }
        queryClient.invalidateQueries({ queryKey: ["brief-action-items", briefId] });
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
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Could not update action item";
      console.error("[brief-actions] toggle failed:", err);
      toast({
        title: "Couldn't update action",
        description: message,
        variant: "destructive",
      });
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
