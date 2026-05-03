import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export type ApplicationStatus = "applied" | "interview" | "offered";

export interface Application {
  id: string;
  user_id: string;
  contract_id?: number;
  job_title: string;
  company?: string;
  location?: string;
  day_rate?: string;
  status: ApplicationStatus;
  notes?: string;
  applied_at: string;
  created_at: string;
}

export type NewApplication = Omit<Application, "id" | "user_id" | "created_at">;

export function useApplications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["applications", user?.id];

  const { data: applications = [], isLoading } = useQuery({
    queryKey,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("*")
        .eq("user_id", user!.id)
        .order("applied_at", { ascending: false });
      if (error) throw error;
      return data as Application[];
    },
  });

  const addApplication = useMutation({
    mutationFn: async (app: NewApplication) => {
      const { error } = await supabase.from("applications").insert({
        ...app,
        user_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ApplicationStatus }) => {
      const { error } = await supabase
        .from("applications")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateNotes = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase
        .from("applications")
        .update({ notes })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteApplication = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("applications")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    applications,
    isLoading,
    addApplication,
    updateStatus,
    updateNotes,
    deleteApplication,
  };
}
