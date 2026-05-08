import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useProPrice } from '@/hooks/useProPrice'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  AlertCircle, CheckCircle2, CheckCircle, Zap, Bell,
  FileText, Search, Star, Lock, Loader2,
  TrendingUp
} from 'lucide-react'
import SEO from '@/components/SEO'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

const proFeatures = [
  { icon: Zap,      text: "500+ sources updated every 10 minutes" },
  { icon: Search,   text: "Full contract details — company, location, description" },
  { icon: Bell,     text: "Instant email alerts for your keywords" },
  { icon: FileText, text: "AI-generated cover letters in one click" },
  { icon: TrendingUp, text: "Application tracker with status updates" },
  { icon: CheckCircle, text: "One-click apply · Save & bookmark contracts" },
]

export default function Signup() {
  const { signUp, signIn, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const { priceData } = useProPrice()

  const [tab, setTab] = useState<'signin' | 'signup'>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  const displayAmount = priceData
    ? `${priceData.currency === 'gbp' ? '£' : '$'}${(priceData.amount / 100).toFixed(2).replace(/\.00$/, '')}`
    : '£29.99'
  const displayInterval = priceData?.interval ?? 'month'

  const reset = () => { setEmail(''); setPassword(''); setError(null); setLoading(false) }
  const switchTab = (t: 'signin' | 'signup') => { reset(); setTab(t) }

  const handleGoogle = async () => {
    setError(null)
    setGoogleLoading(true)
    await signInWithGoogle()
    setGoogleLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (tab === 'signin') {
      const { error } = await signIn(email, password)
      if (error) { setError(error.message); setLoading(false) }
      else navigate('/upgrade')
    } else {
      if (password.length < 6) { setError('Password must be at least 6 characters'); setLoading(false); return }
      const { error } = await signUp(email, password)
      if (error) { setError(error.message); setLoading(false) }
      else { setConfirmed(true); setLoading(false) }
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Create Account — IT ContractHub"
        description="Join IT ContractHub to get instant alerts for new IT contract roles in the UK."
        canonical="/signup"
        noIndex={true}
      />
      <Navbar />

      {/* Gradient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-0">
        <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-primary/20 blur-[120px] animate-pulse" />
        <div className="absolute -bottom-20 -left-20 h-[400px] w-[400px] rounded-full bg-primary/10 blur-[100px]" style={{ animation: "pulse 4s ease-in-out infinite 1.5s" }} />
      </div>

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">

          {/* ── Left: Pro plan + marketing ─────────────── */}
          <div className="hidden lg:block">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              IT ContractHub Pro
            </div>

            <h1 className="text-4xl xl:text-5xl font-heading font-bold leading-[1.1] tracking-tight text-foreground mb-4">
              Find your next contract{" "}
              <span className="text-primary">before</span>{" "}
              the competition even sees it
            </h1>

            <p className="text-muted-foreground text-lg leading-relaxed mb-8">
              500+ sources scraped every 10 minutes. While others browse stale job boards, you're already applying.
            </p>

            <ul className="space-y-3 mb-8">
              {proFeatures.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm text-foreground">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                    <Icon className="h-4 w-4" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>

            {/* Pricing callout */}
            <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5">
              <div className="flex items-end gap-1 mb-1">
                <span className="text-3xl font-heading font-bold text-foreground">{displayAmount}</span>
                <span className="text-muted-foreground mb-1">/{displayInterval}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Cancel anytime · Instant access after payment</p>
              <p className="text-xs text-primary font-medium flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                One contract placement pays for years of Pro
              </p>
            </div>

            {/* Testimonial */}
            <div className="mt-5 rounded-xl border bg-card/60 p-4">
              <div className="flex gap-0.5 mb-2">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />)}
              </div>
              <p className="text-xs text-foreground leading-relaxed italic mb-2">"Landed a £650/day Python contract within 3 days of signing up. IT ContractHub had the listing 4 hours before I saw it anywhere else."</p>
              <p className="text-xs font-semibold text-foreground">James R. <span className="text-muted-foreground font-normal">— Data Engineer · London</span></p>
            </div>
          </div>

          {/* ── Right: auth widget ──────────────────────── */}
          <div className="w-full">
            {/* Mobile headline */}
            <div className="lg:hidden text-center mb-6">
              <h1 className="text-2xl font-heading font-bold text-foreground mb-1">Find your next IT contract faster</h1>
              <p className="text-sm text-muted-foreground">Sign up · Unlock Pro · Start applying</p>
            </div>

            {confirmed ? (
              <div className="rounded-2xl border bg-card shadow-xl p-8 text-center">
                <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
                <h2 className="text-xl font-heading font-bold text-foreground mb-2">Check your email</h2>
                <p className="text-muted-foreground text-sm mb-6">
                  We sent a confirmation link to <strong>{email}</strong>. Click it to verify, then sign in below to unlock Pro.
                </p>
                <Button variant="hero" className="w-full" onClick={() => { setConfirmed(false); switchTab('signin') }}>
                  Sign in &amp; go Pro
                </Button>
              </div>
            ) : (
              <div className="rounded-2xl border bg-card shadow-2xl shadow-primary/10 overflow-hidden">
                {/* Shimmer accent */}
                <div className="h-1 w-full bg-gradient-to-r from-primary via-blue-400 to-primary bg-[length:200%_100%] animate-[shimmer_2s_linear_infinite]" />

                <div className="p-8">
                  {/* Tabs */}
                  <div className="flex rounded-lg bg-accent p-1 mb-6">
                    {(['signup', 'signin'] as const).map((t) => (
                      <button
                        key={t}
                        className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
                          tab === t ? 'bg-background shadow text-foreground' : 'text-muted-foreground'
                        }`}
                        onClick={() => switchTab(t)}
                      >
                        {t === 'signup' ? 'Create Account' : 'Sign In'}
                      </button>
                    ))}
                  </div>

                  <div className="mb-6">
                    <h2 className="font-heading font-bold text-xl text-foreground">
                      {tab === 'signup' ? 'Get started — it\'s free' : 'Welcome back'}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {tab === 'signup'
                        ? 'Create your account, then unlock Pro below'
                        : 'Sign in and go straight to Pro checkout'}
                    </p>
                  </div>

                  {/* Google */}
                  <button
                    type="button"
                    onClick={handleGoogle}
                    disabled={googleLoading}
                    className="w-full flex items-center justify-center gap-3 rounded-lg border bg-background hover:bg-accent transition-colors px-4 py-2.5 text-sm font-medium text-foreground mb-4 disabled:opacity-60"
                  >
                    {googleLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                        <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                        <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
                        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
                      </svg>
                    )}
                    Continue with Google
                  </button>

                  {/* Divider */}
                  <div className="relative mb-4">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-card px-2 text-muted-foreground">or continue with email</span>
                    </div>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                      <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-lg">
                        <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        {tab === 'signin' && (
                          <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
                        )}
                      </div>
                      <Input id="password" type="password" placeholder="Min. 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-11" />
                    </div>
                    <Button type="submit" variant="hero" className="w-full h-12 text-base rounded-xl" disabled={loading}>
                      {loading
                        ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{tab === 'signin' ? 'Signing in…' : 'Creating account…'}</>
                        : tab === 'signin' ? 'Sign In & Go Pro' : 'Create Account — it\'s free'
                      }
                    </Button>
                  </form>

                  <div className="mt-5 pt-5 border-t flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Secure & private</span>
                    <button className="text-primary hover:underline font-medium" onClick={() => switchTab(tab === 'signup' ? 'signin' : 'signup')}>
                      {tab === 'signup' ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                    </button>
                  </div>

                  {tab === 'signup' && (
                    <div className="mt-4 text-center">
                      <p className="text-xs text-muted-foreground">
                        Are you a recruiter?{' '}
                        <Link to="/recruiter/signup" className="text-primary hover:underline font-medium">
                          Create a recruiter account →
                        </Link>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Mobile pricing nudge */}
            <div className="lg:hidden mt-5 rounded-xl border-2 border-primary/30 bg-primary/5 p-4 text-center">
              <p className="text-sm font-semibold text-foreground mb-0.5">Pro Plan — {displayAmount}/{displayInterval}</p>
              <p className="text-xs text-muted-foreground">Full access · AI apply · Instant alerts · Cancel anytime</p>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}
