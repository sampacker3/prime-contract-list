import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Zap, Bell, FileText, Search, Shield, Clock,
  CheckCircle, ArrowRight, Star, ChevronDown, ChevronUp,
  Loader2, CreditCard, Lock, TrendingUp, Users, Timer
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { useProPrice } from "@/hooks/useProPrice";
import { supabase } from "@/lib/supabase";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

/* ─── Hooks ──────────────────────────────────────────────── */

function useScrollReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function useCountUp(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const tick = (now: number) => {
          const raw = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - raw, 3);
          setCount(Math.floor(eased * target));
          if (raw < 1) requestAnimationFrame(tick);
          else setCount(target);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target, duration]);
  return { count, ref };
}

/* ─── Data ───────────────────────────────────────────────── */

const features = [
  {
    icon: Zap,
    title: "Updated every 10 minutes",
    description: "Our scrapers hit 500+ sources around the clock. New contracts appear on ContractHub before they spread anywhere else.",
    highlight: "10× faster than job boards",
  },
  {
    icon: Bell,
    title: "Instant email alerts",
    description: "Set keyword alerts and get notified the moment a matching contract is posted. Be the first CV in the inbox — every time.",
    highlight: "Never miss a role again",
  },
  {
    icon: Search,
    title: "Full contract details",
    description: "See the company name, location, employment type, and complete job description. No more guessing or clicking through to find the basics.",
    highlight: "Everything, upfront",
  },
  {
    icon: FileText,
    title: "One-click apply",
    description: "Direct links to the original posting so you can apply immediately — no extra steps, no lost time navigating between sites.",
    highlight: "Apply in seconds",
  },
  {
    icon: TrendingUp,
    title: "Relevance sorting",
    description: "Sort by newest or relevance. Our scoring surfaces the most relevant contracts for your skills right at the top.",
    highlight: "Smart, not just fast",
  },
  {
    icon: Shield,
    title: "Save & bookmark",
    description: "Bookmark contracts you're interested in and revisit them anytime from your saved jobs. Build a shortlist with a single click.",
    highlight: "Stay organised",
  },
];

const testimonials = [
  {
    quote: "I landed a £650/day Python contract within 3 days of signing up. ContractHub had the listing 4 hours before I saw it anywhere else.",
    name: "James R.",
    role: "Data Engineer · London",
    stars: 5,
  },
  {
    quote: "The alerts are a game changer. I set up a 'DevOps' alert on Monday and had three interviews booked by Wednesday. Can't recommend it enough.",
    name: "Sarah M.",
    role: "DevOps Consultant · Manchester",
    stars: 5,
  },
  {
    quote: "Tried three other contract boards before this. None of them had listings this fresh. The 10-minute update cycle is the real deal.",
    name: "Tom K.",
    role: "Solutions Architect · Edinburgh",
    stars: 5,
  },
];

const faqs = [
  {
    q: "How is ContractHub Pro different from free job boards?",
    a: "Most job boards update once or twice a day and show you what everyone else is already seeing. ContractHub scrapes 500+ sources every 10 minutes, so you see roles hours before the competition — and you get the full details (company, location, description) without having to click through.",
  },
  {
    q: "Can I cancel at any time?",
    a: "Absolutely. You can cancel your Pro subscription at any time from the billing portal in your account settings. No questions asked, no hidden fees.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept all major credit and debit cards (Visa, Mastercard, American Express) via Stripe. Your payment details are never stored on our servers.",
  },
  {
    q: "How quickly will I get access after subscribing?",
    a: "Instantly. As soon as your payment is confirmed, your account is upgraded to Pro and all contract details are unlocked — no waiting.",
  },
  {
    q: "Is there a free trial?",
    a: "We offer a free plan so you can explore the platform before subscribing. The free plan shows contract titles and dates — upgrade to Pro to unlock full details and alerts.",
  },
];

/* ─── Sub-components ─────────────────────────────────────── */

function FeatureCard({ feature, index }: { feature: typeof features[0]; index: number }) {
  const { ref, visible } = useScrollReveal();
  return (
    <div
      ref={ref}
      className="group relative rounded-2xl border bg-card p-6 hover:border-primary/40 hover:shadow-brand transition-all duration-500"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transition: `opacity 0.6s ease, transform 0.6s ease`,
        transitionDelay: `${index * 80}ms`,
      }}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
        <feature.icon className="h-6 w-6" />
      </div>
      <Badge variant="secondary" className="mb-3 text-xs font-semibold text-primary bg-primary/10">
        {feature.highlight}
      </Badge>
      <h3 className="font-heading font-bold text-foreground mb-2">{feature.title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
    </div>
  );
}

function StatItem({ target, suffix = "", label }: { target: number; suffix?: string; label: string }) {
  const { count, ref } = useCountUp(target, 2200);
  return (
    <div className="text-center">
      <p className="text-4xl md:text-5xl font-heading font-bold text-white">
        <span ref={ref}>{count.toLocaleString("en-GB")}</span>{suffix}
      </p>
      <p className="mt-2 text-sm text-white/70 font-medium">{label}</p>
    </div>
  );
}

function TestimonialCard({ t, index }: { t: typeof testimonials[0]; index: number }) {
  const { ref, visible } = useScrollReveal();
  return (
    <div
      ref={ref}
      className="rounded-2xl border bg-card p-6 flex flex-col gap-4"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: "opacity 0.6s ease, transform 0.6s ease",
        transitionDelay: `${index * 120}ms`,
      }}
    >
      <div className="flex gap-0.5">
        {Array.from({ length: t.stars }).map((_, i) => (
          <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
        ))}
      </div>
      <p className="text-sm text-foreground leading-relaxed italic">"{t.quote}"</p>
      <div className="mt-auto pt-4 border-t">
        <p className="font-semibold text-sm text-foreground">{t.name}</p>
        <p className="text-xs text-muted-foreground">{t.role}</p>
      </div>
    </div>
  );
}

function FaqItem({ faq }: { faq: typeof faqs[0] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-accent/50 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <span className="font-heading font-semibold text-foreground text-sm md:text-base">{faq.q}</span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed border-t bg-accent/20">
          <p className="pt-4">{faq.a}</p>
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────── */

export default function UpgradePage() {
  const { user, isPro } = useAuth();
  const navigate = useNavigate();
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);

  // If already Pro, redirect to account
  useEffect(() => {
    if (isPro) navigate("/account", { replace: true });
  }, [isPro, navigate]);

  const handleUpgrade = async () => {
    if (!user) { navigate("/signup"); return; }
    setStripeError(null);
    setStripeLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout-session`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          apikey: SUPABASE_ANON_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          success_url: `${window.location.origin}/account?checkout=success`,
          cancel_url: `${window.location.origin}/upgrade`,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) {
        setStripeError(json.error || json.message || "Something went wrong.");
        setStripeLoading(false);
        return;
      }
      window.location.href = json.url;
    } catch {
      setStripeError("Something went wrong. Please try again.");
      setStripeLoading(false);
    }
  };

  const { priceString, priceData } = useProPrice();
  const displayPrice = priceString ?? "£29.99/month";
  const displayAmount = priceData ? `${priceData.currency === "gbp" ? "£" : "$"}${(priceData.amount / 100).toFixed(2).replace(/\.00$/, "")}` : "£29.99";
  const displayInterval = priceData?.interval ?? "month";

  const { ref: heroRef, visible: heroVisible } = useScrollReveal(0);
  const { ref: pricingRef, visible: pricingVisible } = useScrollReveal();

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Upgrade to Pro — ContractHub"
        description="Get full access to every UK IT contract the moment it's posted. Upgrade to ContractHub Pro."
        canonical="/upgrade"
      />
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[hsl(220,25%,8%)] text-white">
        {/* Animated gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-primary/20 blur-[120px] animate-pulse" />
          <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[100px]" style={{ animation: "pulse 4s ease-in-out infinite 1s" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[800px] w-[800px] rounded-full bg-primary/5 blur-[150px]" />
        </div>

        <div
          ref={heroRef as React.RefObject<HTMLDivElement>}
          className="container relative pt-24 pb-28 md:pt-32 md:pb-36 text-center max-w-4xl"
          style={{
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? "translateY(0)" : "translateY(40px)",
            transition: "opacity 0.8s ease, transform 0.8s ease",
          }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary mb-8 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            ContractHub Pro
          </div>

          <h1 className="text-5xl md:text-7xl font-heading font-bold leading-[1.05] tracking-tight mb-6">
            Win contracts{" "}
            <span className="relative inline-block">
              <span className="relative z-10 text-primary">before</span>
              <span className="absolute inset-x-0 bottom-1 h-3 bg-primary/20 rounded-sm -z-0 blur-sm" />
            </span>
            {" "}the competition even sees them
          </h1>

          <p className="text-xl md:text-2xl text-white/70 max-w-2xl mx-auto leading-relaxed mb-10">
            ContractHub Pro scans 500+ sources every 10 minutes. While other contractors are browsing stale job boards, you're already applying.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <Button
              size="lg"
              variant="hero"
              className="text-base px-8 h-14 rounded-xl shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all duration-300 hover:scale-105"
              onClick={handleUpgrade}
              disabled={stripeLoading}
            >
              {stripeLoading
                ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Redirecting to checkout…</>
                : <><CreditCard className="h-5 w-5 mr-2" /> Start Pro — {displayPrice}</>
              }
            </Button>
            <p className="text-sm text-white/40 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" /> Secure checkout via Stripe · Cancel anytime
            </p>
          </div>

          {stripeError && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 inline-block">{stripeError}</p>
          )}

          {/* Social proof mini-bar */}
          <div className="flex flex-wrap justify-center gap-6 mt-10 text-sm text-white/50">
            {[
              { icon: Users, text: "8,200+ contractors" },
              { icon: Timer, text: "Updated every 10 mins" },
              { icon: Star, text: "4.9/5 average rating" },
            ].map(({ icon: Icon, text }) => (
              <span key={text} className="flex items-center gap-1.5">
                <Icon className="h-4 w-4 text-primary" /> {text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── The Problem ──────────────────────────────────── */}
      <section className="bg-surface-subtle border-b py-20">
        <div className="container max-w-3xl text-center">
          <Badge variant="secondary" className="mb-4 text-xs uppercase tracking-widest font-semibold">The reality</Badge>
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-6 leading-snug">
            By the time a contract appears on a job board,{" "}
            <span className="text-destructive">50+ contractors</span>{" "}have already applied
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed mb-12">
            Traditional job boards aggregate listings daily — sometimes hourly. That lag is killing your chances. The best contracts get filled before most people even see them.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {[
              { icon: Clock, label: "Typical job board delay", value: "12–24 hrs", color: "text-destructive", bg: "bg-destructive/10" },
              { icon: Users, label: "Avg. applications per role", value: "80+", color: "text-orange-500", bg: "bg-orange-500/10" },
              { icon: Zap, label: "ContractHub update cycle", value: "10 mins", color: "text-primary", bg: "bg-primary/10" },
            ].map(({ icon: Icon, label, value, color, bg }) => (
              <div key={label} className="rounded-xl border bg-card p-5">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg} ${color} mb-3`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className={`text-2xl font-heading font-bold ${color} mb-1`}>{value}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────── */}
      <section className="container py-24">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <Badge variant="secondary" className="mb-4 text-xs uppercase tracking-widest font-semibold">Everything in Pro</Badge>
          <h2 className="text-3xl md:text-5xl font-heading font-bold text-foreground leading-tight">
            Every tool you need to land contracts faster
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Pro gives you the full picture — fresh listings, complete details, and smart alerts — so you can move fast and apply with confidence.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => <FeatureCard key={f.title} feature={f} index={i} />)}
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────────── */}
      <section className="bg-[hsl(217,91%,50%)] py-20">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatItem target={12400} suffix="+" label="Active contracts" />
            <StatItem target={500} suffix="+" label="Sources scraped" />
            <StatItem target={8200} suffix="+" label="Pro contractors" />
            <StatItem target={10} suffix=" min" label="Update cycle" />
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────── */}
      <section className="bg-surface-subtle border-y py-24">
        <div className="container">
          <div className="text-center max-w-xl mx-auto mb-14">
            <Badge variant="secondary" className="mb-4 text-xs uppercase tracking-widest font-semibold">Real contractors. Real results.</Badge>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground">
              Contractors landing roles every week
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((t, i) => <TestimonialCard key={t.name} t={t} index={i} />)}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────── */}
      <section className="container py-24">
        <div className="text-center max-w-xl mx-auto mb-14">
          <Badge variant="secondary" className="mb-4 text-xs uppercase tracking-widest font-semibold">Simple pricing</Badge>
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground">
            One plan. Everything included.
          </h2>
          <p className="mt-4 text-muted-foreground">Less than a coffee a day. One contract placement pays for years of Pro.</p>
        </div>

        <div
          ref={pricingRef as React.RefObject<HTMLDivElement>}
          className="max-w-md mx-auto"
          style={{
            opacity: pricingVisible ? 1 : 0,
            transform: pricingVisible ? "translateY(0) scale(1)" : "translateY(24px) scale(0.98)",
            transition: "opacity 0.7s ease, transform 0.7s ease",
          }}
        >
          <div className="relative rounded-2xl border-2 border-primary bg-card shadow-2xl shadow-primary/10 overflow-hidden">
            {/* Top accent bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-primary via-blue-400 to-primary bg-[length:200%_100%] animate-[shimmer_2s_linear_infinite]" />

            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">ContractHub</p>
                  <h3 className="text-2xl font-heading font-bold text-foreground">Pro Plan</h3>
                </div>
                <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
              </div>

              <div className="flex items-end gap-1 mb-2">
                <span className="text-5xl font-heading font-bold text-foreground">{displayAmount}</span>
                <span className="text-muted-foreground mb-2">/{displayInterval}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-8">Billed {displayInterval}ly · Cancel anytime</p>

              <ul className="space-y-3 mb-8">
                {[
                  "Full contract details — company, location, description",
                  "500+ sources updated every 10 minutes",
                  "Instant email alerts for your keywords",
                  "One-click apply to original job posting",
                  "Save & bookmark contracts",
                  "Relevance sorting & advanced search",
                  "Priority access to newly posted roles",
                  "Cancel anytime, no lock-in",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm">
                    <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-foreground">{item}</span>
                  </li>
                ))}
              </ul>

              {stripeError && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2 mb-4">{stripeError}</p>
              )}

              <Button
                variant="hero"
                className="w-full h-12 text-base rounded-xl hover:scale-[1.02] transition-transform"
                onClick={handleUpgrade}
                disabled={stripeLoading}
              >
                {stripeLoading
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Redirecting…</>
                  : <><CreditCard className="h-4 w-4 mr-2" /> Upgrade Now — {displayPrice}</>
                }
              </Button>

              <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Secure payment</span>
                <span>·</span>
                <span>Instant access</span>
                <span>·</span>
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────── */}
      <section className="bg-surface-subtle border-t py-24">
        <div className="container max-w-2xl">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 text-xs uppercase tracking-widest font-semibold">FAQ</Badge>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground">Common questions</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq) => <FaqItem key={faq.q} faq={faq} />)}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[hsl(220,25%,8%)] text-white py-28">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[400px] w-[700px] rounded-full bg-primary/15 blur-[100px]" />
        </div>
        <div className="container relative text-center max-w-2xl">
          <h2 className="text-4xl md:text-5xl font-heading font-bold mb-6 leading-tight">
            The best contracts{" "}
            <span className="text-primary">don't wait.</span>
            <br />Neither should you.
          </h2>
          <p className="text-white/60 text-lg mb-10">
            Join thousands of UK contractors who find roles faster and apply earlier with ContractHub Pro.
          </p>
          <Button
            size="lg"
            variant="hero"
            className="text-base px-10 h-14 rounded-xl shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all duration-300 hover:scale-105"
            onClick={handleUpgrade}
            disabled={stripeLoading}
          >
            {stripeLoading
              ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Redirecting…</>
              : <>Get Pro Access — {displayPrice} <ArrowRight className="ml-2 h-5 w-5" /></>
            }
          </Button>
          <p className="mt-4 text-sm text-white/30">No commitment. Cancel anytime.</p>
        </div>
      </section>

      <Footer />

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
