import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertCircle, CheckCircle2, Briefcase, Users,
  Search, TrendingUp, Lock, Loader2, Star,
} from 'lucide-react'
import SEO from '@/components/SEO'
import Footer from '@/components/Footer'
import Navbar from '@/components/Navbar'

const recruiterFeatures = [
  { icon: Users,      text: "Search thousands of pre-vetted IT contractor CVs" },
  { icon: Search,     text: "Filter by skills, location, availability and rate" },
  { icon: Briefcase,  text: "Post contracts that reach active IT contractors instantly" },
  { icon: TrendingUp, text: "Track who you've saved and contacted" },
]

export default function RecruiterSignup() {
  const { signUpRecruiter, signIn } = useAuth()
  const navigate = useNavigate()

  const [tab, setTab] = useState<'signup' | 'signin'>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  const reset = () => { setEmail(''); setPassword(''); setConfirmPassword(''); setError(null); setLoading(false) }
  const switchTab = (t: 'signup' | 'signin') => { reset(); setTab(t) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (tab === 'signin') {
      const { error } = await signIn(email, password)
      if (error) { setError(error.message); setLoading(false) }
      else navigate('/recruiter/dashboard')
    } else {
      if (password.length < 6) { setError('Password must be at least 6 characters'); setLoading(false); return }
      if (password !== confirmPassword) { setError('Passwords do not match'); setLoading(false); return }
      const { error } = await signUpRecruiter(email, password)
      if (error) { setError(error.message); setLoading(false) }
      else { setConfirmed(true); setLoading(false) }
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Recruiter Account — IT ContractHub"
        description="Create a recruiter account on IT ContractHub to search IT contractor CVs and post contracts to thousands of active candidates."
        canonical="/recruiter/signup"
        noIndex={true}
      />
      <Navbar />

      {/* Gradient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-0">
        <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-violet-500/20 blur-[120px] animate-pulse" />
        <div className="absolute -bottom-20 -left-20 h-[400px] w-[400px] rounded-full bg-indigo-500/10 blur-[100px]" style={{ animation: "pulse 4s ease-in-out infinite 1.5s" }} />
      </div>

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">

          {/* ── Left: recruiter value prop ─────────────── */}
          <div className="hidden lg:block">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-6">
              <Briefcase className="h-3.5 w-3.5" />
              IT ContractHub for Recruiters
            </div>

            <h1 className="text-4xl xl:text-5xl font-heading font-bold leading-[1.1] tracking-tight text-foreground mb-4">
              Find your next{" "}
              <span className="text-violet-600 dark:text-violet-400">IT contractor</span>{" "}
              in hours, not weeks
            </h1>

            <p className="text-muted-foreground text-lg leading-relaxed mb-8">
              Access thousands of pre-vetted IT contractor CVs. Post contracts directly to active candidates. Fill roles faster.
            </p>

            <ul className="space-y-3 mb-8">
              {recruiterFeatures.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm text-foreground">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 shrink-0">
                    <Icon className="h-4 w-4" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>

            {/* Pricing callout */}
            <div className="rounded-xl border-2 border-violet-500/30 bg-violet-500/5 p-5">
              <div className="flex items-end gap-1 mb-1">
                <span className="text-3xl font-heading font-bold text-foreground">£175</span>
                <span className="text-muted-foreground mb-1">/month</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Unlimited CV searches · Unlimited contract posts · Cancel anytime</p>
              <p className="text-xs text-violet-600 dark:text-violet-400 font-medium flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                One placement easily pays for a year of access
              </p>
            </div>

            {/* Testimonial */}
            <div className="mt-5 rounded-xl border bg-card/60 p-4">
              <div className="flex gap-0.5 mb-2">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />)}
              </div>
              <p className="text-xs text-foreground leading-relaxed italic mb-2">"Placed three .NET contractors in under a week. The CVs are current and the candidates actually respond — far better quality than the usual job boards."</p>
              <p className="text-xs font-semibold text-foreground">Sarah M. <span className="text-muted-foreground font-normal">— Senior Technical Recruiter · Manchester</span></p>
            </div>
          </div>

          {/* ── Right: auth widget ──────────────────────── */}
          <div className="w-full">
            {/* Mobile headline */}
            <div className="lg:hidden text-center mb-6">
              <h1 className="text-2xl font-heading font-bold text-foreground mb-1">Recruiter Account</h1>
              <p className="text-sm text-muted-foreground">Access IT contractor CVs · Post contracts</p>
            </div>

            {confirmed ? (
              <div className="rounded-2xl border bg-card shadow-xl p-8 text-center">
                <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
                <h2 className="text-xl font-heading font-bold text-foreground mb-2">Check your email</h2>
                <p className="text-muted-foreground text-sm mb-6">
                  We sent a confirmation link to <strong>{email}</strong>. Click it to verify your account, then sign in to set up your recruiter subscription.
                </p>
                <Button
                  className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700"
                  onClick={() => { setConfirmed(false); switchTab('signin') }}
                >
                  Sign in & Subscribe
                </Button>
              </div>
            ) : (
              <div className="rounded-2xl border bg-card shadow-2xl shadow-violet-500/10 overflow-hidden">
                {/* Shimmer accent */}
                <div className="h-1 w-full bg-gradient-to-r from-violet-600 via-indigo-400 to-violet-600 bg-[length:200%_100%] animate-[shimmer_2s_linear_infinite]" />

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
                        {t === 'signup' ? 'Create Recruiter Account' : 'Sign In'}
                      </button>
                    ))}
                  </div>

                  <div className="mb-6">
                    <h2 className="font-heading font-bold text-xl text-foreground">
                      {tab === 'signup' ? 'Get started as a recruiter' : 'Welcome back'}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {tab === 'signup'
                        ? 'Create your account then choose your subscription plan'
                        : 'Sign in to access your recruiter dashboard'}
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                      <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-lg">
                        <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Label htmlFor="rec-email">Work Email</Label>
                      <Input id="rec-email" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="rec-password">Password</Label>
                        {tab === 'signin' && (
                          <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
                        )}
                      </div>
                      <Input id="rec-password" type="password" placeholder="Min. 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-11" />
                    </div>
                    {tab === 'signup' && (
                      <div className="space-y-1.5">
                        <Label htmlFor="rec-confirm">Confirm Password</Label>
                        <Input id="rec-confirm" type="password" placeholder="Repeat your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="h-11" />
                      </div>
                    )}
                    <Button
                      type="submit"
                      className="w-full h-12 text-base rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700"
                      disabled={loading}
                    >
                      {loading
                        ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{tab === 'signin' ? 'Signing in…' : 'Creating account…'}</>
                        : tab === 'signin' ? 'Sign In' : 'Create Recruiter Account'
                      }
                    </Button>
                  </form>

                  <div className="mt-5 pt-5 border-t flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Secure & private</span>
                    <button className="text-violet-600 dark:text-violet-400 hover:underline font-medium" onClick={() => switchTab(tab === 'signup' ? 'signin' : 'signup')}>
                      {tab === 'signup' ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                    </button>
                  </div>

                  <div className="mt-4 pt-4 border-t text-center">
                    <p className="text-xs text-muted-foreground">
                      Looking for a contract?{' '}
                      <Link to="/signup" className="text-primary hover:underline font-medium">
                        Contractor sign up →
                      </Link>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Mobile pricing nudge */}
            <div className="lg:hidden mt-5 rounded-xl border-2 border-violet-500/30 bg-violet-500/5 p-4 text-center">
              <p className="text-sm font-semibold text-foreground mb-0.5">Recruiter Plan — £175/month</p>
              <p className="text-xs text-muted-foreground">Unlimited CV search · Unlimited contract posts · Cancel anytime</p>
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
