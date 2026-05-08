import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export function useSavedCandidates() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: savedIds = [], isLoading } = useQuery<string[]>({
    queryKey: ["recruiter-saved-candidates", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recruiter_saved_candidates")
        .select("candidate_id")
        .eq("recruiter_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.candidate_id);
    },
  });

  const toggleSave = useMutation({
    mutationFn: async (candidateId: string) => {
      if (!user) throw new Error("Not authenticated");
      const isSaved = savedIds.includes(candidateId);
      if (isSaved) {
        const { error } = await supabase
          .from("recruiter_saved_candidates")
          .delete()
          .eq("recruiter_id", user.id)
          .eq("candidate_id", candidateId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("recruiter_saved_candidates")
          .insert({ recruiter_id: user.id, candidate_id: candidateId });
        if (error) throw error;
      }
    },
    onMutate: async (candidateId: string) => {
      await queryClient.cancelQueries({ queryKey: ["recruiter-saved-candidates", user?.id] });
      const prev = queryClient.getQueryData<string[]>(["recruiter-saved-candidates", user?.id]) ?? [];
      const updated = prev.includes(candidateId)
        ? prev.filter((id) => id !== candidateId)
        : [...prev, candidateId];
      queryClient.setQueryData(["recruiter-saved-candidates", user?.id], updated);
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["recruiter-saved-candidates", user?.id], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["recruiter-saved-candidates", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["recruiter-saved-candidates-full", user?.id] });
    },
  });

  return {
    savedIds,
    isLoading,
    isSaved: (id: string) => savedIds.includes(id),
    toggleSave: (id: string) => toggleSave.mutate(id),
  };
}
