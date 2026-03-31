import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TeamMember = {
  id: string;
  user_id: string | null;
  role: string;
  invited_email: string | null;
  invited_at: string;
  accepted_at: string | null;
  full_name: string | null;
};

type ListMembersResponse = {
  members: TeamMember[];
  memberLimit: number;
};

export function useTeamMembers() {
  return useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("manage-team", {
        body: { action: "list_members" },
      });
      if (error) throw error;
      return data as ListMembersResponse;
    },
  });
}

export function useInviteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      const { data, error } = await supabase.functions.invoke("manage-team", {
        body: { action: "invite", email, role },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team-members"] }),
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (member_id: string) => {
      const { data, error } = await supabase.functions.invoke("manage-team", {
        body: { action: "remove_member", member_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team-members"] }),
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ member_id, role }: { member_id: string; role: string }) => {
      const { data, error } = await supabase.functions.invoke("manage-team", {
        body: { action: "update_role", member_id, role },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team-members"] }),
  });
}
