import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useCVExists } from "@/hooks/useCVExists";
import { supabase } from "@/lib/supabase";

export function useCVContractFit(contractId: number | undefined) {
  const { user, isPro } = useAuth();
  const { cvExists } = useCVExists();

  const { data: score, isLoading } = useQuery({
    queryKey: ["cv-fit", user?.id, contractId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_cv_contract_fit", {
        p_user_id: user!.id,
        p_contract_id: contractId!,
      });
      if (error) throw error;
      return typeof data === "number" ? Math.round(data) : null;
    },
    enabled: !!user && isPro && cvExists && !!contractId,
    staleTime: 10 * 60 * 1000, // cache 10 mins — score won't change unless CV changes
  });

  return { score: score ?? null, isLoading };
}
