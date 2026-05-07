import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useCVExists } from "@/hooks/useCVExists";
import { useQuery } from "@tanstack/react-query";
import AuthModal from "@/components/AuthModal";
import { useAuth } from "@/contexts/AuthContext";
import { useProPrice } from "@/hooks/useProPrice";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Search, ArrowRight, Bell, FileText, Send,
  Zap, Shield, TrendingUp, Mail, AtSign,
  Star, CheckCircle, ChevronDown, ChevronUp, Lock, CreditCard, Sparkles, X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import RotatingText from "@/components/RotatingText";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { supabase } from "@/lib/supabase";
import type { Contract } from "@/types/database";

/* ─── Hooks ─────────────────────────────────────────────────────── */

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
  return { count, ref };
}

function useMarqueeContracts() {
  return useQuery({
    queryKey: ["marquee-contracts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("LinkedinScrapeResults")
        .select("id,JobTitle,Company,Location,WorkType,EmploymentType,Description")
        .order("created_at", { ascending: false })
        .limit(32);
      if (error) throw error;
      return data as Pick<Contract, "id" | "JobTitle" | "Company" | "Location" | "WorkType" | "EmploymentType" | "Description">[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/* ─── Static data ───────────────────────────────────────────────── */

const steps = [
  { icon: Search, title: "We find contracts the moment they're posted", description: "We scrape 500+ sources every 10 minutes — job boards, company sites, and recruiters — so you see roles hours before anyone else." },
  { icon: Bell, title: "You get alerted instantly", description: "Set keyword alerts and get notified the moment a matching contract appears. Be first, every time." },
  { icon: FileText, title: "We write a tailored cover letter from your CV", description: "Our AI reads the job description and your CV, and drafts a cover letter matched to the role in seconds." },
  { icon: Mail, title: "You email the recruiter directly — no portals, no black holes", description: "We surface the direct email of the person who posted the role. Skip the ATS queue and land straight in the recruiter's inbox." },
];

const features = [
  { icon: AtSign, title: "Direct recruiter email on every contract", description: "No more sending into the void. We surface the direct email of the person who posted each role — skip the ATS queue and land straight in the recruiter's inbox.", highlight: "No other board does this" },
  { icon: Zap, title: "Updated every 10 minutes", description: "Our scrapers hit 500+ sources around the clock. New contracts appear on IT ContractHub before they spread anywhere else.", highlight: "10× faster than job boards" },
  { icon: Bell, title: "Instant email alerts", description: "Set keyword alerts and get notified the moment a matching contract is posted. Be the first CV in the inbox — every time.", highlight: "Never miss a role" },
  { icon: FileText, title: "AI cover letter in seconds", description: "Our AI reads the job spec and your uploaded CV, then drafts a tailored cover letter matched to the role. Pair it with the recruiter's direct email and you're unstoppable.", highlight: "Apply in 60 seconds" },
  { icon: TrendingUp, title: "Full contract details, upfront", description: "Company, location, employment type, IR35 status, and the full job description — all visible before you click. No guessing, no wasted clicks.", highlight: "Everything, upfront" },
  { icon: Shield, title: "Track every application", description: "Bookmark, apply, and track your pipeline from Saved → Applied → Interview → Offered. Never lose track of where you stand.", highlight: "Stay in control" },
];

const testimonials = [
  { quote: "The direct recruiter email is a game changer. I emailed the hiring manager directly, bypassed the ATS completely, and had a call booked the same afternoon.", name: "James R.", role: "Data Engineer · London", stars: 5 },
  { quote: "Every other board sent my application into a portal black hole. IT ContractHub gave me the recruiter's actual email — I landed a £650/day contract within a week.", name: "Sarah M.", role: "DevOps Consultant · Manchester", stars: 5 },
  { quote: "Tried three other contract boards before this. None of them had listings this fresh — or the recruiter's email. The 10-minute update cycle plus direct contact is unbeatable.", name: "Tom K.", role: "Solutions Architect · Edinburgh", stars: 5 },
];

const faqs = [
  { q: "How is IT ContractHub different from every other job board?", a: "Two things no one else does: we update every 10 minutes from 500+ sources (so you see roles hours before the competition), and we give you the direct email of the recruiter who posted each role. No ATS portals, no black holes — straight to the decision maker." },
  { q: "What do you mean by 'direct recruiter email'?", a: "Every contract on our platform includes the email address of the person or agency that posted it. Instead of applying through a faceless recruitment portal, you can email the recruiter directly — personalised, fast, and straight to their inbox." },
  { q: "Who is IT ContractHub Pro for?", a: "Any UK IT contractor who's tired of applying late, getting lost in ATS queues, and missing roles. Whether you're in Data, DevOps, Cloud, or Development — direct contact with recruiters changes everything." },
  { q: "Is there a free plan?", a: "Yes — browse contract titles and dates for free. Upgrade to Pro to unlock full details, recruiter emails, AI cover letters, email alerts, and the application tracker." },
];

const POPULAR_SEARCHES = ["Python", "AWS", "React", "DevOps", "Data Engineer", "Azure", "Java", "MLOps"];

/* ─── Sub-components ─────────────────────────────────────────────── */

function ContractCard({ contract, unlocked, lockLabel = "Sign up to view", actionLabel, onHover, onLeave, onAction }: {
  contract: Pick<Contract, "id" | "JobTitle" | "Company" | "Location" | "WorkType" | "EmploymentType" | "Description">;
  unlocked: boolean;
  lockLabel?: string;
  actionLabel?: string;
  onHover: () => void;
  onLeave: () => void;
  onAction: () => void;
}) {
  return (
    <div
      className="relative w-64 shrink-0 rounded-xl border bg-card p-4 shadow-sm select-none group cursor-pointer"
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <p className="font-heading font-semibold text-sm text-foreground leading-snug line-clamp-2 mb-2">
        {contract.JobTitle ?? "Contract Role"}
      </p>
      {contract.WorkType && (
        <p className="text-xs font-semibold text-primary mb-3">{contract.WorkType}</p>
      )}
      {unlocked ? (
        <div className="space-y-1">
          {contract.Company && <p className="text-xs text-muted-foreground truncate">{contract.Company}</p>}
          {contract.Location && <p className="text-xs text-muted-foreground truncate">{contract.Location}</p>}
          {contract.Description && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{contract.Description}</p>}
        </div>
      ) : (
        <>
          <div className="space-y-1.5 blur-[4px] opacity-40 pointer-events-none">
            <p className="text-xs text-muted-foreground truncate">{contract.Company ?? "Company Ltd"}</p>
            <p className="text-xs text-muted-foreground truncate">{contract.Location ?? "United Kingdom"}</p>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{contract.Description ?? "Full details available after sign up..."}</p>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs text-primary/60 font-medium">
            <Lock className="w-3 h-3" />
            {lockLabel}
          </div>
        </>
      )}
      <div className="absolute inset-0 rounded-xl bg-card/85 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
        <button
          onClick={(e) => { e.stopPropagation(); onAction(); }}
          className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-lg hover:bg-primary/90 transition-colors"
        >
          {unlocked ? "See More →" : (actionLabel ?? "Sign Up →")}
        </button>
      </div>
    </div>
  );
}

function ContractMarquee() {
  const { user, isPro } = useAuth();
  const navigate = useNavigate();
  const { data: contracts = [] } = useMarqueeContracts();
  const [paused, setPaused] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const half = Math.ceil(contracts.length / 2);
  const row1 = contracts.slice(0, half);
  const row2 = contracts.slice(half);
  const unlocked = isPro;

  const handleAction = (contractId: number) => {
    if (isPro) navigate(`/contract/${contractId}`);
    else if (user) navigate("/upgrade");
    else setShowAuthModal(true);
  };

  return (
    <section className="py-16 md:py-20 overflow-hidden bg-background border-b">
      <div className="container mb-10 text-center">
        <div className="inline-flex items-center gap-2 mb-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 shadow-[0_0_6px_2px_rgba(239,68,68,0.6)]" />
          </span>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Live Contracts</p>
        </div>
        <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground">
          Get notified on the latest contracts before anyone else
        </h2>
        <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
          {isPro
            ? "Showing the latest contracts — browse to apply early."
            : user
            ? "Upgrade to Pro to unlock full details, rates, and one-click applications."
            : "Sign up to unlock full details, rates, and one-click applications."}
        </p>
      </div>
      {contracts.length > 0 && (
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-24 z-10 bg-gradient-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-24 z-10 bg-gradient-to-l from-background to-transparent" />
          <div className="flex gap-4 mb-4" style={{ animation: "marquee-left 70s linear infinite", width: "max-content", animationPlayState: paused ? "paused" : "running" }}>
            {[...row1, ...row1, ...row1].map((c, i) => (
              <ContractCard key={i} contract={c} unlocked={unlocked}
                lockLabel={user ? "Pro plan required" : "Sign up to view"}
                actionLabel={user ? "Upgrade to Pro →" : "Sign Up →"}
                onHover={() => setPaused(true)} onLeave={() => setPaused(false)}
                onAction={() => handleAction(c.id)}
              />
            ))}
          </div>
          <div className="flex gap-4" style={{ animation: "marquee-right 85s linear infinite", width: "max-content", animationPlayState: paused ? "paused" : "running" }}>
            {[...row2, ...row2, ...row2].map((c, i) => (
              <ContractCard key={i} contract={c} unlocked={unlocked}
                lockLabel={user ? "Pro plan required" : "Sign up to view"}
                actionLabel={user ? "Upgrade to Pro →" : "Sign Up →"}
                onHover={() => setPaused(true)} onLeave={() => setPaused(false)}
                onAction={() => handleAction(c.id)}
              />
            ))}
          </div>
        </div>
      )}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </section>
  );
}

function StatBar() {
  const c1 = useCountUp(12400); const c2 = useCountUp(500); const c3 = useCountUp(8200); const c4 = useCountUp(10);
  return (
    <section className="bg-gradient-brand py-14">
      <div className="container grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        {[
          { val: c1, suffix: "+", label: "Active Contracts" },
          { val: c2, suffix: "+", label: "Sources Scraped" },
          { val: c3, suffix: "+", label: "Happy Contractors" },
          { val: c4, suffix: " min", label: "Update Cycle" },
        ].map(({ val, suffix, label }) => (
          <div key={label}>
            <p className="text-4xl md:text-5xl font-heading font-bold text-white">
              <span ref={val.ref}>{val.count.toLocaleString("en-GB")}</span>{suffix}
            </p>
            <p className="mt-2 text-sm text-white/80 font-medium">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeatureCard({ feature, index }: { feature: typeof features[0]; index: number }) {
  const { ref, visible } = useScrollReveal();
  return (
    <div ref={ref} className="relative rounded-2xl border bg-card p-6"
      style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(32px)", transition: "opacity 0.6s ease, transform 0.6s ease", transitionDelay: `${index * 80}ms` }}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
        <feature.icon className="h-6 w-6" />
      </div>
      <Badge variant="secondary" className="mb-3 text-xs font-semibold text-primary bg-primary/10">{feature.highlight}</Badge>
      <h3 className="font-heading font-bold text-foreground mb-2">{feature.title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
    </div>
  );
}

function StepItem({ step, index, isLast }: { step: typeof steps[0]; index: number; isLast: boolean }) {
  const { ref, visible } = useScrollReveal();
  return (
    <div ref={ref}>
      <div className="rounded-xl border bg-card p-6 flex gap-5 items-start transition-all duration-700"
        style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(24px)", transitionDelay: `${index * 150}ms` }}
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-heading font-bold text-lg">{index + 1}</div>
        <div className="flex-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-primary mb-3"><step.icon className="h-5 w-5" /></div>
          <h3 className="font-heading font-semibold text-foreground text-lg leading-snug">{step.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{step.description}</p>
        </div>
      </div>
      {!isLast && <div className="ml-12 py-1"><div className="border-l-2 border-dashed border-primary/30 h-8" /></div>}
    </div>
  );
}

function TestimonialCard({ t, index }: { t: typeof testimonials[0]; index: number }) {
  const { ref, visible } = useScrollReveal();
  return (
    <div ref={ref} className="rounded-2xl border border-border bg-card backdrop-blur-sm p-6 flex flex-col gap-4"
      style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(24px)", transition: "opacity 0.6s ease, transform 0.6s ease", transitionDelay: `${index * 120}ms` }}
    >
      <div className="flex gap-0.5">{Array.from({ length: t.stars }).map((_, i) => <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />)}</div>
      <p className="text-sm text-foreground/80 leading-relaxed italic">"{t.quote}"</p>
      <div className="mt-auto pt-4 border-t border-border">
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
      <button className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-accent/50 transition-colors" onClick={() => setOpen(o => !o)}>
        <span className="font-heading font-semibold text-foreground text-sm md:text-base">{faq.q}</span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>
      {open && <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed border-t bg-accent/20"><p className="pt-4">{faq.a}</p></div>}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────── */

const Index = () => {
  const { user, isPro } = useAuth();
  const { cvExists } = useCVExists();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [heroSearch, setHeroSearch] = useState("");
  const [heroSearchFocused, setHeroSearchFocused] = useState(false);
  const heroCountUp = useCountUp(700);
  const { priceString, priceData } = useProPrice();
  const displayPrice = priceString ?? "£29.99/month";
  const displayAmount = priceData ? `${priceData.currency === "gbp" ? "£" : "$"}${(priceData.amount / 100).toFixed(2).replace(/\.00$/, "")}` : "£29.99";
  const displayInterval = priceData?.interval ?? "month";

  const handleExplore = () => {
    if (user) navigate("/contracts");
    else setShowAuthModal(true);
  };

  const handleHeroSearch = (term?: string) => {
    (document.activeElement as HTMLElement)?.blur();
    const q = (term ?? heroSearch).trim();
    if (user) navigate(q ? `/contracts?q=${encodeURIComponent(q)}` : "/contracts");
    else navigate(q ? `/search-preview?q=${encodeURIComponent(q)}` : "/search-preview");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="IT ContractHub — Find IT Contract Roles Across the UK"
        description="Find your next IT contract in the UK. IT ContractHub aggregates thousands of contract roles from hundreds of sources, updated in real-time. Search by role, location, and rate."
        canonical="/"
        jsonLd={{ "@context": "https://schema.org", "@type": "WebSite", "name": "IT ContractHub", "url": "https://contracthub.co.uk", "description": "Find IT contract roles across the UK, updated in real-time.", "potentialAction": { "@type": "SearchAction", "target": "https://contracthub.co.uk/contracts?q={search_term_string}", "query-input": "required name=search_term_string" } }}
      />
      <Navbar />

      {/* ── 1. HERO — dark ───────────────────────────────── */}
      <section className="relative overflow-hidden bg-background text-foreground">
        {/* Ambient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-primary/20 blur-[120px] animate-pulse" />
          <div className="absolute -bottom-20 -left-40 h-[400px] w-[400px] rounded-full bg-primary/10 blur-[100px]" style={{ animation: "pulse 4s ease-in-out infinite 1.5s" }} />
        </div>

        <div className="container relative pt-6 pb-8 md:pt-12 md:pb-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left */}
            <div>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-heading font-bold leading-[1.05] tracking-tight text-foreground">
                Find your next<br />
                <RotatingText /><br />
                contract now
              </h1>
              <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed">
                The{" "}
                <span className="relative inline-block text-foreground font-semibold">
                  one
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 100 5"
                    preserveAspectRatio="none"
                    className="absolute top-full left-0 w-full h-[4px] -mt-1"
                  >
                    <path d="M0,4 Q50,1 100,3" stroke="#3b82f6" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                  </svg>
                </span>
                {" "}site you need as an IT contractor. Find contracts, get the recruiter's direct email, apply in minutes.
              </p>
              <p className="mt-5 text-2xl md:text-3xl font-heading font-bold text-foreground" ref={heroCountUp.ref}>
                Over{" "}
                <span className="text-primary underline decoration-primary decoration-2 underline-offset-4">
                  {heroCountUp.count}
                </span>
                {" "}contracts in the past month
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Button variant="hero" size="lg" onClick={handleExplore} className="shadow-lg shadow-primary/30">
                  Explore Contracts <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
                {!user && (
                  <Button size="lg" onClick={() => setShowAuthModal(true)}
                    className="border border-foreground/20 bg-foreground/5 text-foreground hover:bg-foreground/10 backdrop-blur-sm"
                  >
                    Log In <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Right: search card — glass style with AI liquid border */}
            <div
              className="rounded-2xl p-[1.5px]"
              style={{
                background: "linear-gradient(135deg, rgba(124,58,237,0.6), rgba(59,130,246,0.4), rgba(6,182,212,0.3), rgba(168,85,247,0.5), rgba(124,58,237,0.6))",
                backgroundSize: "300% 300%",
                animation: "ai-border-spin 6s ease infinite",
                boxShadow: "0 0 32px 2px rgba(124,58,237,0.15), 0 0 64px 4px rgba(59,130,246,0.08)",
              }}
            >
            <div className="rounded-2xl p-6 bg-card">
              <p className="font-heading font-bold text-lg text-foreground mb-1">Search contracts</p>
              <p className="text-sm text-muted-foreground mb-4">Find your next role by keyword, skill or technology</p>
              <form onSubmit={(e) => { e.preventDefault(); handleHeroSearch(); }} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <Input
                    placeholder="e.g. Python, AWS, DevOps..."
                    className="pl-9 pr-8"
                    value={heroSearch}
                    onChange={(e) => setHeroSearch(e.target.value)}
                    onFocus={() => setHeroSearchFocused(true)}
                    onBlur={() => setTimeout(() => setHeroSearchFocused(false), 150)}
                  />
                  {heroSearch && (
                    <button
                      type="button"
                      onClick={() => setHeroSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-10"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  {heroSearchFocused && user && cvExists && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-border bg-card shadow-lg overflow-hidden">
                      <button
                        type="button"
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setHeroSearchFocused(false);
                          navigate("/contracts?cv=1");
                        }}
                      >
                        <div
                          className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6, #06b6d4)" }}
                        >
                          <Sparkles className="h-3.5 w-3.5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Search for contracts based on my CV</p>
                          <p className="text-xs text-muted-foreground">AI will match roles to your skills and experience</p>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
                <Button type="submit" variant="hero">Search</Button>
              </form>
              <div className="mt-4">
                <p className="text-xs text-muted-foreground mb-2">Popular searches</p>
                <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1">
                  {POPULAR_SEARCHES.map((s) => (
                    <button key={s} type="button" onClick={() => handleHeroSearch(s)}
                      className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors shrink-0"
                    >{s}</button>
                  ))}
                </div>
              </div>
              <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground border-t border-border pt-4">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                Updated every 10 minutes from 500+ sources
              </div>
            </div>
            </div>
          </div>
        </div>

        {/* Skills ticker */}
        <div className="relative overflow-hidden mt-8 pb-10">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 w-24 z-10 bg-gradient-to-r from-background to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-24 z-10 bg-gradient-to-l from-background to-transparent" />
            <div className="flex gap-3" style={{ animation: "marquee-left 65s linear infinite", width: "max-content" }}>
              {[
                "Python","MLOps","Machine Learning","AI / LLMs","Data Engineer","BI Developer",
                "Network Engineer","Solutions Architect","Java","C++","Ruby","Liquid","GCP",
                "AWS","Azure","SQL","DevOps","Kubernetes","Terraform","React","TypeScript",
                "Node.js","Golang","Rust","Scala","Spark","Kafka","Snowflake","dbt",
                "Power BI","Tableau","Salesforce","SAP","iOS / Swift","Android / Kotlin",
                "Cyber Security","Penetration Testing","Cloud Architecture","Site Reliability",
                "Python","MLOps","Machine Learning","AI / LLMs","Data Engineer","BI Developer",
                "Network Engineer","Solutions Architect","Java","C++","Ruby","Liquid","GCP",
                "AWS","Azure","SQL","DevOps","Kubernetes","Terraform","React","TypeScript",
                "Node.js","Golang","Rust","Scala","Spark","Kafka","Snowflake","dbt",
                "Power BI","Tableau","Salesforce","SAP","iOS / Swift","Android / Kotlin",
                "Cyber Security","Penetration Testing","Cloud Architecture","Site Reliability",
              ].map((skill, i) => (
                <span key={i} className="shrink-0 rounded-full border border-border bg-muted px-4 py-1.5 text-xs font-medium text-muted-foreground whitespace-nowrap">{skill}</span>
              ))}
            </div>
          </div>
        </div>

        {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      </section>

      {/* ── 2. STATS — primary blue ───────────────────────── */}
      <StatBar />

      {/* ── 3. LIVE CONTRACTS CAROUSEL — white ───────────── */}
      <ContractMarquee />

      {/* ── 5. FEATURES — white ──────────────────────────── */}
      <section className="container py-24">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <Badge variant="secondary" className="mb-4 text-xs uppercase tracking-widest font-semibold">Everything in Pro</Badge>
          <h2 className="text-3xl md:text-5xl font-heading font-bold text-foreground leading-tight">
            Every tool you need to land contracts faster
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">Fresh listings, complete details, and smart alerts — so you move fast and apply with confidence.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => <FeatureCard key={f.title} feature={f} index={i} />)}
        </div>
      </section>

      {/* ── 5b. AI APPLY — dark gradient ─────────────────── */}
      <section className="relative overflow-hidden bg-background border-y py-24">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-violet-500/10 blur-[120px]" />
          <div className="absolute bottom-0 right-0 h-[300px] w-[400px] rounded-full bg-primary/10 blur-[100px]" />
        </div>

        <div className="container relative max-w-6xl">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 mb-5">
              <Sparkles className="h-3.5 w-3.5 text-violet-400" />
              <span className="text-xs font-semibold uppercase tracking-widest text-violet-400">AI-Powered Applications</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-heading font-bold text-foreground leading-tight">
              Stop writing cover letters.<br />
              <span style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6, #06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Let AI do it for you.
              </span>
            </h2>
            <p className="mt-4 text-muted-foreground text-lg leading-relaxed">
              Upload your CV once. Every time you find a contract you like, we instantly generate a tailored cover letter — matched to that specific role, in seconds.
            </p>
          </div>

          {/* 3-step visual */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {[
              {
                step: "01",
                icon: FileText,
                title: "Upload your CV",
                desc: "Add your CV to your profile once. We securely store it and use it as the foundation for every application.",
                color: "from-violet-500/20 to-violet-500/5",
                iconColor: "text-violet-400",
                borderColor: "border-violet-500/20",
              },
              {
                step: "02",
                icon: Search,
                title: "Find a contract",
                desc: "Browse thousands of live UK IT contracts updated every 10 minutes. Click the one you want to apply to.",
                color: "from-primary/20 to-primary/5",
                iconColor: "text-primary",
                borderColor: "border-primary/20",
              },
              {
                step: "03",
                icon: Sparkles,
                title: "Get your cover letter",
                desc: "Our AI reads the job description and your CV, then writes a tailored cover letter highlighting exactly the right experience.",
                color: "from-cyan-500/20 to-cyan-500/5",
                iconColor: "text-cyan-400",
                borderColor: "border-cyan-500/20",
              },
            ].map(({ step, icon: Icon, title, desc, color, iconColor, borderColor }) => (
              <div key={step} className={`relative rounded-2xl border ${borderColor} bg-gradient-to-b ${color} p-6`}>
                <span className="absolute top-4 right-5 text-5xl font-heading font-bold text-foreground/5 select-none leading-none">{step}</span>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-background border ${borderColor} mb-4`}>
                  <Icon className={`h-5 w-5 ${iconColor}`} />
                </div>
                <h3 className="font-heading font-bold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* Benefits + CTA side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <h3 className="text-2xl font-heading font-bold text-foreground mb-6">What you get with Apply with AI</h3>
              <ul className="space-y-3">
                {[
                  "Cover letter tailored to every role — not a generic template",
                  "AI reads both your CV and the job spec to find the perfect match",
                  "Flags skill gaps and keywords you're missing for that role",
                  "Apply to more contracts in less time, without burning out",
                  "Be the first to apply — we're fast, and so is our AI",
                ].map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>

            {/* Mock cover letter card */}
            <div
              className="rounded-2xl p-[1.5px]"
              style={{
                background: "linear-gradient(135deg, rgba(124,58,237,0.5), rgba(59,130,246,0.4), rgba(6,182,212,0.3))",
              }}
            >
              <div className="rounded-2xl bg-card p-6 space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <div
                    className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6, #06b6d4)" }}
                  >
                    <Sparkles className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">AI-generated cover letter</span>
                  <Badge variant="secondary" className="ml-auto text-xs">Ready in 3s</Badge>
                </div>
                {[
                  { w: "w-full", opacity: "opacity-60" },
                  { w: "w-5/6", opacity: "opacity-50" },
                  { w: "w-full", opacity: "opacity-60" },
                  { w: "w-4/5", opacity: "opacity-40" },
                  { w: "w-full", opacity: "opacity-60" },
                  { w: "w-3/4", opacity: "opacity-50" },
                ].map(({ w, opacity }, i) => (
                  <div key={i} className={`h-2.5 rounded-full bg-foreground/20 ${w} ${opacity}`} />
                ))}
                <div className="pt-2 flex items-center gap-2">
                  <div className="h-2.5 w-24 rounded-full bg-primary/40" />
                  <div className="h-2.5 w-16 rounded-full bg-primary/25" />
                </div>
                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Matched to: <span className="text-primary font-medium">Senior Python Developer</span></span>
                  <Button variant="hero" size="sm" className="h-7 text-xs px-3" asChild>
                    <Link to="/about-apply-with-ai">Learn more</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. HOW IT WORKS — surface-subtle ─────────────── */}
      <section className="bg-surface-subtle border-y py-20 md:py-28">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge variant="secondary" className="mb-4 text-xs uppercase tracking-widest font-semibold">How it works</Badge>
            <h2 className="text-3xl md:text-5xl font-heading font-bold text-foreground">
              The one site to find contracts —{" "}
              <span className="text-primary underline decoration-primary underline-offset-4">now</span>
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">Applying early is key to landing contracts. We've got your back.</p>
          </div>
          <div className="max-w-2xl mx-auto">
            {steps.map((step, i) => <StepItem key={step.title} step={step} index={i} isLast={i === steps.length - 1} />)}
          </div>
        </div>
      </section>

      {/* ── 7. TESTIMONIALS — dark ───────────────────────── */}
      <section className="bg-muted py-24 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[400px] w-[700px] rounded-full bg-primary/10 blur-[120px]" />
        </div>
        <div className="container relative">
          <div className="text-center max-w-xl mx-auto mb-14">
            <Badge className="mb-4 text-xs uppercase tracking-widest font-semibold bg-foreground/10 text-foreground border-foreground/10 hover:bg-foreground/10">Real contractors. Real results.</Badge>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground">Contractors landing roles every week</h2>
            <p className="mt-3 text-muted-foreground">Don't take our word for it — here's what Pro members say.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((t, i) => <TestimonialCard key={t.name} t={t} index={i} />)}
          </div>
        </div>
      </section>

      {/* ── 8. PRICING CTA — primary gradient ────────────── */}
      <section className="bg-gradient-brand py-20">
        <div className="container max-w-3xl text-center">
          <Badge className="mb-6 text-xs uppercase tracking-widest font-semibold bg-white/20 text-white border-white/20 hover:bg-white/20">Simple pricing</Badge>
          <h2 className="text-3xl md:text-5xl font-heading font-bold text-primary-foreground mb-4">
            One plan. Everything included.
          </h2>
          <p className="text-primary-foreground/70 text-lg mb-10">Less than a coffee a day. One contract placement pays for a full year of Pro.</p>

          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 max-w-sm mx-auto mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/60 mb-1">IT ContractHub Pro</p>
            <div className="flex items-end justify-center gap-1 mb-1">
              <span className="text-5xl font-heading font-bold text-white">{displayAmount}</span>
              <span className="text-white/50 mb-2">/{displayInterval}</span>
            </div>
            <p className="text-xs text-white/40 mb-6">Cancel anytime</p>
            <ul className="space-y-2 text-left mb-6">
              {["500+ sources, updated every 10 mins","Full company & job details","Instant keyword alerts","One-click apply","Save & bookmark contracts"].map(item => (
                <li key={item} className="flex items-center gap-2 text-sm text-white/80">
                  <CheckCircle className="h-4 w-4 text-white/60 shrink-0" />{item}
                </li>
              ))}
            </ul>
            {isPro ? (
              <div className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-white/20 text-white font-semibold text-sm">
                <CheckCircle className="h-4 w-4 shrink-0" /> You're already on Pro, nice!
              </div>
            ) : (
              <Button asChild size="lg" className="w-full bg-white text-primary hover:bg-white/90 font-semibold rounded-xl h-12">
                <Link to="/upgrade"><CreditCard className="h-4 w-4 mr-2" />Get Pro Access</Link>
              </Button>
            )}
          </div>
          <p className="text-primary-foreground/40 text-sm flex items-center justify-center gap-1.5">
            <Lock className="h-3.5 w-3.5" /> Secure checkout via Stripe
          </p>
        </div>
      </section>

      {/* ── 9. FAQ — white ───────────────────────────────── */}
      <section className="container py-24 max-w-2xl">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4 text-xs uppercase tracking-widest font-semibold">FAQ</Badge>
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground">Common questions</h2>
        </div>
        <div className="space-y-3">
          {faqs.map((faq) => <FaqItem key={faq.q} faq={faq} />)}
        </div>
      </section>

      {/* ── 10. FINAL CTA — dark ─────────────────────────── */}
      <section className="bg-surface-subtle border-t py-28 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[400px] w-[700px] rounded-full bg-primary/15 blur-[100px]" />
        </div>
        <div className="container relative text-center max-w-2xl">
          <h2 className="text-4xl md:text-5xl font-heading font-bold mb-6 leading-tight text-foreground">
            The best contracts{" "}
            <span className="text-primary">don't wait.</span>
            <br />Neither should you.
          </h2>
          <p className="text-muted-foreground text-lg mb-10">Join thousands of UK contractors who find roles faster and apply earlier with IT ContractHub.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" size="lg" onClick={handleExplore}
              className="text-base px-10 h-14 rounded-xl shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all hover:scale-105"
            >
              {user ? "Browse Contracts" : "Get Started Free"} <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            {!isPro && (
              <Button asChild size="lg"
                className="text-base px-10 h-14 rounded-xl border border-border bg-card text-foreground hover:bg-muted transition-colors"
              >
                <Link to="/upgrade">View Pro Plan <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      <Footer />

      <style>{`
        @keyframes marquee-left {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        @keyframes marquee-right {
          0%   { transform: translateX(-33.333%); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default Index;
