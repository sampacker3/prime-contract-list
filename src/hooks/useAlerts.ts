import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Alert } from '@/types/database'

export function useAlerts() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['alerts', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Alert[]
    },
  })

  const createAlert = useMutation({
    mutationFn: async (keywords: string) => {
      if (!user) throw new Error('Not authenticated')
      // Case-insensitive duplicate check
      const isDuplicate = alerts.some(
        (a) => a.keywords.toLowerCase() === keywords.toLowerCase()
      )
      if (isDuplicate) throw new Error('duplicate')
      const { error } = await supabase.from('alerts').insert({
        user_id: user.id,
        keywords,
        enabled: true,
        frequency: 'instant',
        match_count: 0,
      })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts', user?.id] }),
  })

  const deleteAlert = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('alerts').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts', user?.id] }),
  })

  const toggleAlert = useMutation({
    mutationFn: async ({ id, enabled }: { id: number; enabled: boolean }) => {
      const { error } = await supabase.from('alerts').update({ enabled }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts', user?.id] }),
  })

  const deleteAll = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase.from('alerts').delete().eq('user_id', user.id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts', user?.id] }),
  })

  const pauseAll = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase.from('alerts').update({ enabled }).eq('user_id', user.id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts', user?.id] }),
  })

  // Returns ids of all but the first (oldest) occurrence of each keyword
  const duplicateIds = (() => {
    const seen = new Map<string, number>() // lowercase keyword → first id seen
    const dupes: number[] = []
    // alerts are ordered newest-first; reverse so we keep the oldest
    ;[...alerts].reverse().forEach((a) => {
      const key = a.keywords.toLowerCase()
      if (seen.has(key)) {
        dupes.push(a.id)
      } else {
        seen.set(key, a.id)
      }
    })
    return dupes
  })()

  const deduplicateAlerts = useMutation({
    mutationFn: async () => {
      if (!user || duplicateIds.length === 0) return
      const { error } = await supabase
        .from('alerts')
        .delete()
        .in('id', duplicateIds)
        .eq('user_id', user.id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts', user?.id] }),
  })

  return { alerts, isLoading, createAlert, deleteAlert, toggleAlert, deleteAll, pauseAll, duplicateIds, deduplicateAlerts }
}
