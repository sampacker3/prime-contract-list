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

      // Re-sort contracts to match save-date order (saved is already newest-first)
      const saveOrder = new Map(saved.map((s, i) => [s.JobID, i]))
      return (contracts ?? []).sort((a, b) => (saveOrder.get(a.id) ?? 999) - (saveOrder.get(b.id) ?? 999))
    },
  })

  const toggleSave = useMutation({
    mutationFn: async (jobId: number) => {
      if (!user) throw new Error('Not authenticated')

      if (savedJobIds.has(jobId)) {
        // Unsave — remove from UserSavedJobs
        const { error } = await supabase
          .from('UserSavedJobs')
          .delete()
          .eq('UserID', user.id)
          .eq('JobID', jobId)
        if (error) throw error

        // Remove from tracker only if still in 'saved' stage (not progressed)
        await supabase
          .from('applications')
          .delete()
          .eq('user_id', user.id)
          .eq('contract_id', jobId)
          .eq('status', 'saved')
      } else {
        // Save — insert into UserSavedJobs
        const { error } = await supabase
          .from('UserSavedJobs')
          .insert({ UserID: user.id, JobID: jobId })
        if (error) throw error

        // Fetch contract details for the tracker entry
        const { data: contract } = await supabase
          .from('LinkedinScrapeResults')
          .select('JobTitle, Company, Location, PayRate')
          .eq('id', jobId)
          .single()

        // Add to tracker as 'saved' — ignore if already tracked at a later stage
        const { data: existing } = await supabase
          .from('applications')
          .select('id')
          .eq('user_id', user.id)
          .eq('contract_id', jobId)
          .maybeSingle()

        if (!existing) {
          await supabase.from('applications').insert({
            user_id: user.id,
            contract_id: jobId,
            job_title: contract?.JobTitle ?? 'Contract Role',
            company: contract?.Company ?? null,
            location: contract?.Location ?? null,
            day_rate: contract?.PayRate ?? null,
            status: 'saved',
            applied_at: new Date().toISOString(),
          })
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedJobs', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['savedContracts', user?.id] })
    },
  })

  return { savedJobIds, savedContracts, savedLoading, toggleSave }
}
