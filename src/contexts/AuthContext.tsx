import { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

type AuthContextType = {
  session: Session | null
  user: User | null
  loading: boolean
  isPro: boolean
  proLoading: boolean
  isRecruiter: boolean
  accountType: 'contractor' | 'recruiter' | null
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>
  signUpRecruiter: (email: string, password: string) => Promise<{ error: Error | null }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signInWithGoogle: (redirectTo?: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: Error | null }>
  updatePassword: (password: string) => Promise<{ error: Error | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPro, setIsPro] = useState(false)
  const [proLoading, setProLoading] = useState(true)
  const [isRecruiter, setIsRecruiter] = useState(false)
  const [accountType, setAccountType] = useState<'contractor' | 'recruiter' | null>(null)

  // Fetch subscription + account type whenever user changes
  useEffect(() => {
    if (!user) {
      setIsPro(false)
      setIsRecruiter(false)
      setAccountType(null)
      setProLoading(false)
      return
    }
    setProLoading(true)
    supabase
      .from('profiles')
      .select('subscription_active, account_type, subscription_plan')
      .eq('id', user.id)
      .maybeSingle()
      .then(async ({ data }) => {
        setIsPro(!!data?.subscription_active)

        // If user signed up as recruiter but profile doesn't reflect it yet (e.g. just confirmed email)
        const metaAccountType = user.user_metadata?.account_type as string | undefined
        if (metaAccountType === 'recruiter' && data?.account_type !== 'recruiter') {
          await supabase
            .from('profiles')
            .upsert({ id: user.id, account_type: 'recruiter' })
          setIsRecruiter(true)
          setAccountType('recruiter')
        } else {
          const type = data?.account_type ?? null
          setIsRecruiter(type === 'recruiter')
          setAccountType(type as 'contractor' | 'recruiter' | null)
        }
        setProLoading(false)
      })
      .catch(() => setProLoading(false))
  }, [user])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error }
  }

  const signUpRecruiter = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { account_type: 'recruiter' } },
    })
    return { error }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signInWithGoogle = async (redirectTo?: string) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}${redirectTo ?? '/contracts'}` },
    })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { error }
  }

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password })
    return { error }
  }

  return (
    <AuthContext.Provider value={{
      session, user, loading, isPro, proLoading,
      isRecruiter, accountType,
      signUp, signUpRecruiter, signIn, signInWithGoogle,
      signOut, resetPassword, updatePassword,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
