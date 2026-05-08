import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string

export type CvFitResult = {
  score: number    // 0–100
  summary: string  // ≤15 words
  cached: boolean
}

/**
 * Fetches a CV fit score for the given contract.
 * - Only fires when: user is Pro, has a CV, and has been on the page for 2s (enabled flag)
 * - Results are cached server-side for 7 days so repeat visits are free
 */
export function useCvFit(
  contractId: number | null,
  jobTitle: string | null,
  description: string | null,
  enabled: boolean  // caller controls — pass true after a 2s debounce
) {
  const { user, isPro } = useAuth()

  return useQuery<CvFitResult>({
    queryKey: ['cv-fit', user?.id, contractId],
    enabled: !!user && isPro && !!contractId && enabled,
    staleTime: 7 * 24 * 60 * 60 * 1000, // 7 days client-side
    retry: false,
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const res = await fetch(`${SUPABASE_URL}/functions/v1/cv-fit`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contract_id: contractId,
          job_title: jobTitle ?? '',
          description: (description ?? '').slice(0, 1500),
        }),
      })

      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error ?? 'cv-fit failed')
      return json as CvFitResult
    },
  })
}
