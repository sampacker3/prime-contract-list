import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

/**
 * Handles the OAuth callback after Google sign-in.
 * Supabase v2 PKCE flow redirects here with ?code=XXX.
 * We exchange the code for a session then redirect to the original destination.
 */
export default function AuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('code')
    const rawNext = searchParams.get('next') ?? '/contracts'
    // Only allow internal paths — block absolute URLs and protocol-relative '//' redirects
    const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/contracts'

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          console.error('Auth callback error:', error.message)
          navigate('/login', { replace: true })
        } else {
          navigate(next, { replace: true })
        }
      })
    } else {
      // No code — maybe a hash-based session, getSession will handle it
      supabase.auth.getSession().then(({ data: { session } }) => {
        navigate(session ? next : '/login', { replace: true })
      })
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm">Signing you in…</p>
      </div>
    </div>
  )
}
