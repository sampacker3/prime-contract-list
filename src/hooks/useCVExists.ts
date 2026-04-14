import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Checks whether the current user has a CV uploaded.
 * Uses localStorage as a fast cache; falls back to a Supabase storage check.
 */
export function useCVExists() {
  const { user } = useAuth();

  const { data: cvExists, isLoading } = useQuery({
    queryKey: ["cv-exists", user?.id],
    queryFn: async () => {
      // Fast path: localStorage flag set by Account page on upload/delete
      const saved = localStorage.getItem(`cv_filename_${user!.id}`);
      if (saved) return true;

      // Fallback: check storage directly
      const { data } = await supabase.storage
        .from("cvs")
        .list(user!.id);
      return !!(data?.find((f) => f.name === "cv.pdf"));
    },
    enabled: !!user,
    staleTime: 60 * 1000, // 1 minute
  });

  return { cvExists: cvExists ?? false, cvLoading: isLoading };
}
