import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useProPrice } from '@/hooks/useProPrice'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertCircle, CheckCircle2, CheckCircle, Zap, Bell,
  FileText, Search, Star, Users, Timer, Lock, ArrowRight,
  CreditCard, Shield, TrendingUp, Loader2
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import SEO from '@/components/SEO'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { supabase } from '@/lib/supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

const benefits = [
  { icon: Zap,      text: "Updated every 10 mins" },
  { icon: Bell,     text: "Instant email alerts" },
  { icon: Search,   text: "Full contract details" },
  { icon: FileText, text: "AI cover letters" },
]

const proFeatures = [
  "Full contract details — company, location, description",
  "500+ sources updated every 10 minutes",
  "Instant email alerts for your keywords",
  "One-click apply to original job posting",
  "AI-generated cover letters in seconds",
  "Save & bookmark contracts",
  "Application tracker with status updates",
  "Cancel anytime — no lock-in",
]

export default function Signup() {
  const { signUp, user } = useAuth()
  const navigate = useNavigate()
  const { priceString, priceData } = useProPrice()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [stripeLoading, setStripeLoading] = useState(false)
  const [stripeError, setStripeError] = useState<string | null>(null)

  const displayPrice = priceString ?? '£29.99/month'
  const displayAmount = priceData
    ? `${priceData.currency === 'gbp' ? '£' : '$'}${(priceData.amount / 100).toFixed(2).replace(/\.00$/, '')}`
    : '£29.99'
  const displayInterval = priceData?.interval ?? 'month'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }
    const { error } = await signUp(email, password)
    if (error) { setError(error.message); setLoading(false) }
    else setSuccess(true)
  }

  const handleUpgrade = async () => {
    if (!user) { navigate('/signup'); return }
    setStripeError(null)
    setStripeLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout-session`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          apikey: SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success_url: `${window.location.origin}/account?checkout=success`,
          cancel_url: `${window.location.origin}/upgrade`,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.url) {
        setStripeError(json.error || json.message || 'Something went wrong.')
        setStripeLoading(false)
        return
      }
      window.location.href = json.url
    } catch {
      setStripeError('Something went wrong. Please try again.')
      setStripeLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md text-center rounded-2xl border bg-card shadow-xl p-10">
            <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-heading font-bold text-foreground mb-2">Check your email</h2>
            <p className="text-muted-foreground text-sm mb-6">
              We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then come back to go Pro.
            </p>
            <Button variant="hero" className="w-full mb-3" onClick={() => navigate('/upgrade')}>
              See Pro features <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" className="w-full" onClick={() => navigate('/login')}>
              Back to login
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Create Account — IT ContractHub"
        description="Join IT ContractHub to get instant alerts for new IT contract roles in the UK. Free to sign up."
        canonical="/signup"
        noIndex={true}
      />
      <Navbar />

      {/* Gradient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[600px] rounded-full bg-primary/15 blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-primary/10 blur-[100px]" style={{ animation: "pulse 4s ease-in-out infinite 1.5s" }} />
      </div>

      <main className="relative z-10 flex flex-col items-center px-4 py-12">

        {/* ── Step 1: Sign up ───────────────────────────── */}
        <div className="w-full max-w-2xl">

          {/* Badge + headline */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary mb-5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              Free to join
            </div>
            <h1 className="text-3xl md:text-4xl font-heading font-bold text-foreground leading-tight mb-3">
              Find your next IT contract{" "}
              <span className="text-primary">before the competition</span>
            </h1>
            <p className="text-muted-foreground text-base max-w-lg mx-auto">
              500+ sources scraped every 10 minutes. Full details, smart alerts, and AI-powered applications.
            </p>
          </div>

          {/* Benefit pills */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {benefits.map(({ icon: Icon, text }) => (
              <span key={text} className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-foreground">
                <Icon className="h-3.5 w-3.5 text-primary" />
                {text}
              </span>
            ))}
          </div>

          {/* Step label */}
          <div className="flex items-center gap-3 mb-4">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">1</span>
            <span className="text-sm font-semibold text-foreground">Create your free account</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Sign-up card */}
          <div className="w-full rounded-2xl border bg-card shadow-2xl shadow-primary/10 overflow-hidden mb-6">
            <div className="h-1 w-full bg-gradient-to-r from-primary via-blue-400 to-primary bg-[length:200%_100%] animate-[shimmer_2s_linear_infinite]" />
            <div className="p-8">
              <div className="mb-6">
                <h2 className="text-xl font-heading font-bold text-foreground">Get started — it's free</h2>
                <p className="text-sm text-muted-foreground mt-1">No credit card required</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-lg">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
                    <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                    <Input id="password" type="password" placeholder="Min. 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-11" />
                  </div>
                </div>
                <Button type="submit" variant="hero" className="w-full h-12 text-base rounded-xl hover:scale-[1.02] transition-transform shadow-lg shadow-primary/25" disabled={loading}>
                  {loading ? 'Creating account…' : <>Create free account <ArrowRight className="ml-2 h-4 w-4" /></>}
                </Button>
              </form>

              <div className="mt-5 pt-5 border-t flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Secure & private</span>
                <span>Already have an account?{' '}<Link to="/login" className="text-primary hover:underline font-medium">Sign in</Link></span>
              </div>
            </div>
          </div>

          {/* ── Step 2: Go Pro ───────────────────────────── */}
          <div className="flex items-center gap-3 mb-4 mt-8">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted border text-muted-foreground text-xs font-bold shrink-0">2</span>
            <span className="text-sm font-semibold text-foreground">Unlock Pro — full access to everything</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Pro card */}
          <div className="relative w-full rounded-2xl border-2 border-primary bg-card shadow-2xl shadow-primary/10 overflow-hidden">
            <div className="h-1.5 w-full bg-gradient-to-r from-primary via-blue-400 to-primary bg-[length:200%_100%] animate-[shimmer_2s_linear_infinite]" />

            <div className="p-8">
              <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">IT ContractHub</p>
                  <h3 className="text-2xl font-heading font-bold text-foreground">Pro Plan</h3>
                  <div className="flex items-end gap-1 mt-2">
                    <span className="text-4xl font-heading font-bold text-foreground">{displayAmount}</span>
                    <span className="text-muted-foreground mb-1">/{displayInterval}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Billed {displayInterval}ly · Cancel anytime</p>
                </div>
                <Badge className="bg-primary text-primary-foreground shrink-0">Most Popular</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-8">
                {proFeatures.map((item) => (
                  <div key={item} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-foreground">{item}</span>
                  </div>
                ))}
              </div>

              {stripeError && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2 mb-4">{stripeError}</p>
              )}

              <Button
                variant="hero"
                className="w-full h-12 text-base rounded-xl hover:scale-[1.02] transition-transform shadow-lg shadow-primary/25"
                onClick={handleUpgrade}
                disabled={stripeLoading}
              >
                {stripeLoading
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Redirecting to checkout…</>
                  : <><CreditCard className="h-4 w-4 mr-2" /> Get Pro — {displayPrice}</>
                }
              </Button>

              <div className="flex flex-wrap items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Secure via Stripe</span>
                <span>·</span>
                <span>Instant access</span>
                <span>·</span>
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>

          {/* Value nudge */}
          <div className="mt-4 rounded-xl border bg-primary/5 border-primary/20 px-5 py-3.5 flex flex-wrap items-center gap-3 text-sm">
            <TrendingUp className="h-4 w-4 text-primary shrink-0" />
            <span className="text-foreground font-medium">One contract placement pays for <span className="text-primary font-semibold">years</span> of Pro.</span>
            <span className="text-muted-foreground text-xs">Less than a coffee a day.</span>
          </div>

          {/* Social proof + testimonials */}
          <div className="flex flex-wrap justify-center gap-5 mt-8 text-xs text-muted-foreground">
            {[
              { icon: Users, text: "8,200+ contractors" },
              { icon: Timer, text: "Updated every 10 mins" },
              { icon: Star,  text: "4.9/5 average rating" },
            ].map(({ icon: Icon, text }) => (
              <span key={text} className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-primary" /> {text}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {[
              { quote: "Landed a £650/day role within 3 days. IT ContractHub had it 4 hours before anywhere else.", name: "James R.", role: "Data Engineer · London" },
              { quote: "Set up a DevOps alert on Monday, had three interviews booked by Wednesday.", name: "Sarah M.", role: "DevOps Consultant · Manchester" },
            ].map((t) => (
              <div key={t.name} className="rounded-xl border bg-card/60 backdrop-blur-sm p-4">
                <div className="flex gap-0.5 mb-2">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />)}
                </div>
                <p className="text-xs text-foreground leading-relaxed italic mb-3">"{t.quote}"</p>
                <p className="text-xs font-semibold text-foreground">{t.name} <span className="text-muted-foreground font-normal">— {t.role}</span></p>
              </div>
            ))}
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
