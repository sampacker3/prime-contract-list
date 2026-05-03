import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertCircle, CheckCircle2, CheckCircle, Zap, Bell,
  FileText, Search, Star, Users, Timer, Lock, ArrowRight
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import SEO from '@/components/SEO'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

const benefits = [
  { icon: Zap,      text: "500+ sources updated every 10 minutes" },
  { icon: Bell,     text: "Instant email alerts for your keywords" },
  { icon: Search,   text: "Full contract details — company, salary, location" },
  { icon: FileText, text: "AI-generated cover letters in one click" },
]

const testimonials = [
  {
    quote: "Landed a £650/day role within 3 days. IT ContractHub had it 4 hours before anywhere else.",
    name: "James R.",
    role: "Data Engineer · London",
  },
  {
    quote: "Set up a DevOps alert on Monday, had three interviews booked by Wednesday.",
    name: "Sarah M.",
    role: "DevOps Consultant · Manchester",
  },
]

export default function Signup() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

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

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
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
              We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
            </p>
            <Button variant="outline" onClick={() => navigate('/login')}>
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

      <main className="flex-1 flex items-stretch">
        {/* ── Left: marketing panel ─────────────────────── */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-background border-r flex-col justify-center px-14 xl:px-20 py-16">
          {/* Gradient orbs */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-primary/20 blur-[120px] animate-pulse" />
            <div className="absolute -bottom-32 -left-32 h-[400px] w-[400px] rounded-full bg-primary/10 blur-[100px]" style={{ animation: "pulse 4s ease-in-out infinite 1.5s" }} />
          </div>

          <div className="relative z-10 max-w-md">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              Free to join
            </div>

            <h1 className="text-4xl xl:text-5xl font-heading font-bold leading-[1.1] tracking-tight text-foreground mb-5">
              Find your next{" "}
              <span className="relative inline-block">
                <span className="relative z-10 text-primary">IT contract</span>
                <span className="absolute inset-x-0 bottom-1 h-2.5 bg-primary/20 rounded-sm -z-0 blur-sm" />
              </span>{" "}
              before the competition
            </h1>

            <p className="text-muted-foreground text-lg leading-relaxed mb-10">
              500+ sources scraped every 10 minutes. Be first to every role — with full details, smart alerts, and AI-powered applications.
            </p>

            {/* Benefits */}
            <ul className="space-y-4 mb-12">
              {benefits.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm text-foreground">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                    <Icon className="h-4 w-4" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>

            {/* Social proof */}
            <div className="flex flex-wrap gap-5 text-xs text-muted-foreground mb-12">
              {[
                { icon: Users, text: "8,200+ contractors" },
                { icon: Timer, text: "Updated every 10 mins" },
                { icon: Star,  text: "4.9/5 rating" },
              ].map(({ icon: Icon, text }) => (
                <span key={text} className="flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 text-primary" /> {text}
                </span>
              ))}
            </div>

            {/* Testimonials */}
            <div className="space-y-4">
              {testimonials.map((t) => (
                <div key={t.name} className="rounded-xl border bg-card/60 backdrop-blur-sm p-4">
                  <div className="flex gap-0.5 mb-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-xs text-foreground leading-relaxed italic mb-3">"{t.quote}"</p>
                  <p className="text-xs font-semibold text-foreground">{t.name} <span className="text-muted-foreground font-normal">— {t.role}</span></p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: form panel ─────────────────────────── */}
        <div className="w-full lg:w-1/2 flex items-center justify-center px-4 py-12 lg:py-16">
          <div className="w-full max-w-md">
            {/* Mobile-only headline */}
            <div className="lg:hidden text-center mb-8">
              <div className="inline-flex items-center gap-2 rounded-full border bg-muted px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary mb-4">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                Free to join
              </div>
              <h1 className="text-3xl font-heading font-bold text-foreground mb-2">Find your next IT contract</h1>
              <p className="text-muted-foreground text-sm">500+ sources · Updated every 10 mins · AI-powered</p>
            </div>

            {/* Form card */}
            <div className="rounded-2xl border bg-card shadow-xl shadow-primary/5 overflow-hidden">
              {/* Accent bar */}
              <div className="h-1 w-full bg-gradient-to-r from-primary via-blue-400 to-primary bg-[length:200%_100%] animate-[shimmer_2s_linear_infinite]" />

              <div className="p-8">
                <div className="mb-7">
                  <Badge variant="secondary" className="mb-3 text-xs font-semibold text-primary bg-primary/10">
                    Create your free account
                  </Badge>
                  <h2 className="text-2xl font-heading font-bold text-foreground">Get started today</h2>
                  <p className="text-sm text-muted-foreground mt-1">Free forever · No credit card required</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-lg">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Min. 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-11"
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="hero"
                    className="w-full h-12 text-base rounded-xl hover:scale-[1.02] transition-transform shadow-lg shadow-primary/25"
                    disabled={loading}
                  >
                    {loading ? 'Creating account…' : <>Create free account <ArrowRight className="ml-2 h-4 w-4" /></>}
                  </Button>
                </form>

                {/* What you get */}
                <ul className="mt-6 space-y-2.5">
                  {[
                    "Browse live IT contracts instantly",
                    "Upgrade to Pro for full details & AI apply",
                    "Cancel or downgrade anytime",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>

                <div className="mt-6 pt-6 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Secure & private</span>
                  <span>
                    Already have an account?{' '}
                    <Link to="/login" className="text-primary hover:underline font-medium">
                      Sign in
                    </Link>
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile benefits */}
            <div className="lg:hidden mt-8 grid grid-cols-2 gap-3">
              {benefits.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-start gap-2 rounded-xl border bg-card p-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-xs text-foreground leading-snug">{text}</span>
                </div>
              ))}
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
