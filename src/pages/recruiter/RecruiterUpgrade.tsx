import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import {
  Briefcase, Users, Search, TrendingUp, CheckCircle2,
  Loader2, Shield, Zap, Star, ArrowRight,
} from 'lucide-react'
import SEO from '@/components/SEO'
import RecruiterNavbar from '@/components/RecruiterNavbar'
import Footer from '@/components/Footer'
import Navbar from '@/components/Navbar'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

const features = [
  { icon: Users,     title: "Unlimited CV Search",          desc: "Browse every IT contractor who has uploaded a CV — no per-search fees." },
  { icon: Search,    title: "Advanced Filters",             desc: "Filter by skills, location, availability and day rate to find the right fit fast." },
  { icon: Briefcase, title: "Unlimited Contract Posts",     desc: "Post as many roles as you need — your listings appear alongside all scraped contracts." },
  { icon: TrendingUp,title: "Candidate Shortlisting",       desc: "Save candidates to shortlists and track who you've already approached." },
  { icon: Zap,       title: "Direct Contact",               desc: "See candidate email directly — no platform messaging, just a direct line." },
  { icon: Shield,    title: "CV Download",                  desc: "Download full CVs instantly for your records and client submissions." },
]

const checklist = [
  "Unlimited contractor CV access",
  "Full candidate email & contact details",
  "CV download (PDF)",
  "Advanced search filters",
  "Unlimited contract posts",
  "Candidate shortlist / saved list",
  "Posted contracts in live feed",
  "Cancel anytime",
]

const faqs = [
  {
    q: "What types of IT contractors are on the platform?",
    a: "The platform covers the full spectrum of IT: software developers (Java, Python, .NET, React, etc.), DevOps & cloud engineers, data engineers & analysts, cybersecurity, project managers, business analysts, and more.",
  },
  {
    q: "Are the CVs up to date?",
    a: "Contractors upload their own CVs and we prompt them to update periodically. You can see when the CV was last uploaded on each candidate profile.",
  },
  {
    q: "Where do my posted contracts appear?",
    a: "Your contracts go into the same live feed that thousands of IT contractors browse daily — alongside all scraped LinkedIn and job board listings.",
  },
  {
    q: "Can I cancel at any time?",
    a: "Yes. Cancel from your account settings at any time and you won't be charged again. You retain access until the end of your billing period.",
  },
  {
    q: "Is there a free trial?",
    a: "We don't offer a free trial currently, but at £175/month one successful placement more than covers months of access.",
  },
]

export default function RecruiterUpgrade() {
  const { user, isRecruiter } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const handleSubscribe = async () => {
    if (!user) {
      navigate('/recruiter/signup')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${(await import('@/lib/supabase').then(m => m.supabase.auth.getSession())).data.session?.access_token}`,
        },
        body: JSON.stringify({ plan: 'recruiter' }),
      })
      const { url, error: fnError } = await res.json()
      if (fnError || !url) throw new Error(fnError ?? 'No checkout URL returned')
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong — please try again.')
      setLoading(false)
    }
  }

  // Choose navbar based on whether they're a logged-in recruiter
  const Nav = isRecruiter ? RecruiterNavbar : Navbar

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Recruiter Plan — IT ContractHub"
        description="Subscribe to the IT ContractHub Recruiter plan. Search thousands of IT contractor CVs, post contracts, and fill roles faster for £175/month."
        canonical="/recruiter/upgrade"
      />
      <Nav />

      {/* Hero */}
      <section className="border-b bg-gradient-to-br from-violet-600 to-indigo-700 text-white">
        <div className="container py-16 md:py-20 max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest mb-6">
            <Briefcase className="h-3.5 w-3.5" />
            Recruiter Plan
          </div>
          <h1 className="text-3xl md:text-5xl font-heading font-bold leading-tight mb-4">
            Fill IT contract roles faster
          </h1>
          <p className="text-white/80 text-lg max-w-2xl mx-auto mb-8">
            Thousands of active IT contractors. Their CVs, their contact details, ready to go. One flat fee — no per-click nonsense.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="text-center">
              <div className="text-5xl font-heading font-bold">£175</div>
              <div className="text-white/70 text-sm">per month · cancel anytime</div>
            </div>
            <Button
              size="lg"
              className="bg-white text-violet-700 hover:bg-white/90 font-bold px-8 h-12 rounded-xl"
              onClick={handleSubscribe}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {user ? 'Subscribe Now' : 'Get Started'} <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
          {error && <p className="text-red-200 text-sm mt-4">{error}</p>}
          {!user && (
            <p className="text-white/60 text-xs mt-3">
              Already have an account?{' '}
              <Link to="/recruiter/signup" className="text-white hover:underline font-medium">Sign in →</Link>
            </p>
          )}
        </div>
      </section>

      {/* Features grid */}
      <section className="container py-16 max-w-5xl">
        <h2 className="text-2xl font-heading font-bold text-foreground text-center mb-10">
          Everything you need to place IT contractors
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-xl border bg-card p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 mb-3">
                <Icon className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <p className="font-heading font-semibold text-foreground mb-1">{title}</p>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing card */}
      <section className="container pb-16 max-w-lg">
        <div className="rounded-2xl border-2 border-violet-500/30 bg-card shadow-xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-violet-600 to-indigo-600" />
          <div className="p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-1">Recruiter Plan</p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-heading font-bold text-foreground">£175</span>
                  <span className="text-muted-foreground mb-1">/month</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Billed monthly · Cancel anytime</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10">
                <Briefcase className="h-6 w-6 text-violet-600 dark:text-violet-400" />
              </div>
            </div>

            <ul className="space-y-2.5 mb-8">
              {checklist.map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-violet-600 dark:text-violet-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>

            <Button
              className="w-full h-12 text-base rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700"
              onClick={handleSubscribe}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {user ? 'Subscribe — £175/month' : 'Get Started'}
            </Button>

            {!user && (
              <p className="text-xs text-muted-foreground text-center mt-3">
                <Link to="/recruiter/signup" className="text-violet-600 hover:underline font-medium">Create account first →</Link>
              </p>
            )}

            {error && <p className="text-xs text-destructive mt-3 text-center">{error}</p>}
          </div>
        </div>

        {/* Testimonial */}
        <div className="mt-6 rounded-xl border bg-card/60 p-5">
          <div className="flex gap-0.5 mb-2">
            {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />)}
          </div>
          <p className="text-sm text-foreground italic mb-2">"Three placements in the first month. The contractors are active, their CVs are current, and I can reach them directly."</p>
          <p className="text-xs font-semibold text-foreground">Sarah M. <span className="text-muted-foreground font-normal">— Senior Technical Recruiter · Manchester</span></p>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t bg-surface-subtle">
        <div className="container py-16 max-w-3xl">
          <h2 className="text-2xl font-heading font-bold text-foreground text-center mb-8">Frequently asked questions</h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-xl border bg-card overflow-hidden">
                <button
                  className="w-full text-left px-5 py-4 flex items-center justify-between gap-4"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-medium text-foreground text-sm">{faq.q}</span>
                  <span className="text-muted-foreground text-lg shrink-0">{openFaq === i ? '−' : '+'}</span>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm text-muted-foreground">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
