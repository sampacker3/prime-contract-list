import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Zap, Shield, Clock, Users, Search, TrendingUp,
  Sparkles, Target, Code2, Globe, ArrowRight, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

/* ── Scroll-reveal hook ─────────────────────────────────────── */
function useReveal(threshold = 0.15) {
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

/* ── Count-up hook ──────────────────────────────────────────── */
function useCountUp(target: number, duration = 1800) {
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
  return { ref, count };
}

/* ── Stat card ──────────────────────────────────────────────── */
function StatCard({ value, suffix = "+", label, sub }: { value: number; suffix?: string; label: string; sub: string }) {
  const { ref, count } = useCountUp(value);
  return (
    <div className="text-center">
      <p className="text-4xl md:text-5xl font-heading font-bold text-gradient-brand">
        <span ref={ref}>{count}</span>{suffix}
      </p>
      <p className="mt-1 font-heading font-semibold text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}

/* ── Value card ─────────────────────────────────────────────── */
function ValueCard({ icon: Icon, title, desc, delay }: { icon: React.ElementType; title: string; desc: string; delay: number }) {
  const { ref, visible } = useReveal(0.1);
  return (
    <div
      ref={ref}
      className="rounded-2xl border bg-card p-6 transition-all duration-700"
      style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(24px)", transitionDelay: `${delay}ms` }}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 mb-4">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <h3 className="font-heading font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

/* ── Timeline step ──────────────────────────────────────────── */
function Step({ n, title, desc, last = false }: { n: number; title: string; desc: string; last?: boolean }) {
  const { ref, visible } = useReveal(0.1);
  return (
    <div ref={ref} className="flex gap-5 transition-all duration-700" style={{ opacity: visible ? 1 : 0, transform: visible ? "translateX(0)" : "translateX(-20px)" }}>
      <div className="flex flex-col items-center shrink-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-heading font-bold text-sm shrink-0">
          {n}
        </div>
        {!last && <div className="w-px flex-1 bg-border mt-2" />}
      </div>
      <div className={last ? "pb-0" : "pb-8"}>
        <h3 className="font-heading font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

const values = [
  {
    icon: Zap,
    title: "Speed first",
    desc: "Contracts are scraped every 10 minutes. By the time you open your inbox, the roles are already here — often before they've been posted anywhere else.",
  },
  {
    icon: Shield,
    title: "No noise",
    desc: "We filter out duplicates and stale listings automatically. Every result you see is a genuine, active contract opportunity.",
  },
  {
    icon: Target,
    title: "Built for contractors",
    desc: "Not a generic job board. Everything — from IR35 status to day rate visibility to AI cover letters — is designed specifically for the UK IT contracting market.",
  },
  {
    icon: Sparkles,
    title: "AI that actually helps",
    desc: "Our Apply with AI feature reads your CV and the contract description together, then writes a cover letter that actually speaks to the role — not a template.",
  },
  {
    icon: TrendingUp,
    title: "Always improving",
    desc: "We add new sources, new features, and new automations constantly. If there's something that'd make your contracting life easier, we want to build it.",
  },
  {
    icon: Users,
    title: "Community-driven",
    desc: "Built by contractors, for contractors. Feedback from real users shapes every feature we ship — from alert logic to how we surface matched contracts.",
  },
];

export default function About() {
  const heroReveal = useReveal(0.05);
  const statsReveal = useReveal(0.1);
  const missionReveal = useReveal(0.1);

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="About IT ContractHub — The UK's IT Contract Aggregator"
        description="We built IT ContractHub to fix the broken UK IT contract job search. One place, hundreds of sources, updated every 10 minutes."
        canonical="/about"
      />
      <Navbar />

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-primary/5 blur-[120px]" />
          <div className="absolute top-20 right-0 h-[300px] w-[400px] rounded-full bg-primary/8 blur-[100px]" />
        </div>

        <div
          ref={heroReveal.ref}
          className="container relative py-20 md:py-32 max-w-4xl text-center transition-all duration-1000"
          style={{ opacity: heroReveal.visible ? 1 : 0, transform: heroReveal.visible ? "translateY(0)" : "translateY(32px)" }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-xs font-semibold text-primary mb-6">
            <Globe className="h-3.5 w-3.5" />
            Built for UK IT contractors
          </div>

          <h1 className="font-heading font-bold text-4xl md:text-6xl text-foreground leading-tight mb-6">
            We got tired of checking{" "}
            <span className="text-gradient-brand">20 job boards</span>{" "}
            every morning
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-8">
            So we built IT ContractHub — a single place that pulls IT contract roles from hundreds of sources,
            every 10 minutes, and gives you the tools to apply faster than anyone else.
          </p>

          <div className="flex flex-wrap gap-3 justify-center">
            <Button variant="hero" size="lg" asChild>
              <Link to="/contracts">Browse Contracts <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/contact">Get in touch</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Stats bar ───────────────────────────────────────── */}
      <section className="border-b bg-surface-subtle">
        <div
          ref={statsReveal.ref}
          className="container py-10 max-w-4xl transition-all duration-700"
          style={{ opacity: statsReveal.visible ? 1 : 0 }}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatCard value={500} label="Sources scraped" sub="and growing" />
            <StatCard value={10} suffix=" min" label="Update cycle" sub="not daily — every 10 mins" />
            <StatCard value={700} label="Contracts/month" sub="across all tech stacks" />
            <StatCard value={100} suffix="%" label="UK focused" sub="IR35, day rate & all" />
          </div>
        </div>
      </section>

      {/* ── Mission ─────────────────────────────────────────── */}
      <section className="container py-16 md:py-24 max-w-4xl">
        <div
          ref={missionReveal.ref}
          className="grid md:grid-cols-2 gap-12 items-center transition-all duration-700"
          style={{ opacity: missionReveal.visible ? 1 : 0, transform: missionReveal.visible ? "translateY(0)" : "translateY(24px)" }}
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Our story</p>
            <h2 className="font-heading font-bold text-3xl md:text-4xl text-foreground mb-5 leading-tight">
              The UK contract market is fragmented. We fixed that.
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Finding IT contracts in the UK meant logging into LinkedIn, CWJobs, Reed, Jobserve, and a dozen agency sites
              every single day — all showing different roles, all with their own search quirks, all slow.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              IT ContractHub was built to solve that. We spider hundreds of sources continuously and bring everything
              into one clean feed — searchable, filterable, and sorted by recency so you never miss a fresh listing.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              For Pro users, we layer on top: full descriptions, IR35 status, day rates, email alerts, and AI-powered
              cover letters that actually match the role you're applying to.
            </p>
          </div>

          {/* Timeline */}
          <div className="pt-2">
            <Step n={1} title="We scrape hundreds of sources" desc="Every 10 minutes, our scrapers pull new contracts from agency sites, job boards, and direct listings across the UK." />
            <Step n={2} title="Duplicates are removed automatically" desc="Our dedup logic identifies the same role posted across multiple boards so you only see it once." />
            <Step n={3} title="You search one clean feed" desc="Filter by keyword, location, employment type — and see results sorted by when they were actually posted, not ranked by who paid more." />
            <Step n={4} title="Apply with AI in seconds" last desc="Upload your CV once and our AI writes a tailored cover letter for any role you want to apply to — in under a minute." />
          </div>
        </div>
      </section>

      {/* ── Values grid ─────────────────────────────────────── */}
      <section className="border-t bg-surface-subtle">
        <div className="container py-16 md:py-24 max-w-5xl">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">What we stand for</p>
            <h2 className="font-heading font-bold text-3xl md:text-4xl text-foreground">Built around what contractors actually need</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {values.map((v, i) => (
              <ValueCard key={v.title} icon={v.icon} title={v.title} desc={v.desc} delay={i * 80} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Tech stack callout ───────────────────────────────── */}
      <section className="container py-16 max-w-3xl text-center">
        <div className="rounded-2xl border bg-card p-8 md:p-12 relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[200px] w-[400px] rounded-full bg-primary/6 blur-[80px]" />
          </div>
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-brand mx-auto mb-5">
              <Code2 className="h-6 w-6 text-primary-foreground" />
            </div>
            <h2 className="font-heading font-bold text-2xl md:text-3xl text-foreground mb-4">
              Want to know what we monitor?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              See the full list of search terms and technology categories we track across all our sources —
              from Python and Azure to niche ERP stacks.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button variant="hero" asChild>
                <Link to="/contract-sources">View all search terms <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/contact">Suggest a new one</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA strip ───────────────────────────────────────── */}
      <section className="border-t bg-surface-subtle">
        <div className="container py-14 max-w-2xl text-center">
          <div className="flex flex-wrap gap-2 justify-center mb-4">
            {["No noise", "Real-time results", "AI cover letters", "IR35 visible", "Day rates shown"].map(t => (
              <span key={t} className="inline-flex items-center gap-1.5 text-xs rounded-full border bg-card px-3 py-1 text-muted-foreground">
                <CheckCircle2 className="h-3 w-3 text-primary" />{t}
              </span>
            ))}
          </div>
          <h2 className="font-heading font-bold text-2xl md:text-3xl text-foreground mb-3">Ready to find your next contract?</h2>
          <p className="text-muted-foreground mb-6 text-sm">Hundreds of IT roles added every day. Takes 30 seconds to get started.</p>
          <Button variant="hero" size="lg" asChild>
            <Link to="/signup">Start for free <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
