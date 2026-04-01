import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export function useSavedJobs() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Fetch the set of saved job IDs for the current user
  const { data: savedJobIds = new Set<number>() } = useQuery({
    queryKey: ['savedJobs', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('UserSavedJobs')
        .select('JobID')
        .eq('UserID', user!.id)
      if (error) throw error
      return new Set<number>(data.map((r) => r.JobID))
    },
  })

  // Fetch full saved jobs with contract details (for the Saved Jobs page)
  const { data: savedContracts = [], isLoading: savedLoading } = useQuery({
    queryKey: ['savedContracts', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: saved, error: savedError } = await supabase
        .from('UserSavedJobs')
        .select('JobID, created_at')
        .eq('UserID', user!.id)
        .order('created_at', { ascending: false })
      if (savedError) throw savedError
      if (!saved.length) return []

      const jobIds = saved.map((s) => s.JobID)
      const { data: contracts, error: contractsError } = await supabase
        .from('LinkedinScrapeResults')
        .select('*')
        .in('id', jobIds)
      if (contractsError) throw contractsError
      return contracts ?? []
    },
  })

  const toggleSave = useMutation({
    mutationFn: async (jobId: number) => {
      if (!user) throw new Error('Not authenticated')

      if (savedJobIds.has(jobId)) {
        // Unsave — delete the row
        const { error } = await supabase
          .from('UserSavedJobs')
          .delete()
          .eq('UserID', user.id)
          .eq('JobID', jobId)
        if (error) throw error
      } else {
        // Save — insert a row
        const { error } = await supabase
          .from('UserSavedJobs')
          .insert({ UserID: user.id, JobID: jobId })
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedJobs', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['savedContracts', user?.id] })
    },
  })

  return { savedJobIds, savedContracts, savedLoading, toggleSave }
}
