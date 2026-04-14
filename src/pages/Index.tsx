import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import AuthModal from "@/components/AuthModal";
import { useAuth } from "@/contexts/AuthContext";
import { useProPrice } from "@/hooks/useProPrice";
import {
  Search, ArrowRight, Bell, FileText, Send,
  Zap, Shield, TrendingUp, Clock, Users, Timer,
  Star, CheckCircle, ChevronDown, ChevronUp, Lock, CreditCard,
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
  { icon: Search, title: "We search hundreds of businesses and recruiters for contracts", description: "We scrape contracts from hundreds of job boards and company sites so you don't have to." },
  { icon: Bell, title: "We notify you as soon as a relevant contract is posted", description: "No more hunting and missing opportunities because you are too late." },
  { icon: FileText, title: "We draft a cover letter based on your CV and the selected contract", description: "Create tailored applications every time, saving you time and improving your application." },
  { icon: Send, title: "You apply to your ideal contract", description: "That hard work has been done, all you need to do is apply with your custom cover letter to your contract early thanks to ContractHub." },
];

const features = [
  { icon: Zap, title: "Updated every 10 minutes", description: "Our scrapers hit 500+ sources around the clock. New contracts appear on ContractHub before they spread anywhere else.", highlight: "10× faster than job boards" },
  { icon: Bell, title: "Instant email alerts", description: "Set keyword alerts and get notified the moment a matching contract is posted. Be the first CV in the inbox — every time.", highlight: "Never miss a role" },
  { icon: Search, title: "Full contract details", description: "See the company name, location, employment type, and complete job description. No more guessing what the role actually is.", highlight: "Everything, upfront" },
  { icon: FileText, title: "One-click apply", description: "Direct links to the original posting so you can apply immediately — no extra steps, no lost time navigating between sites.", highlight: "Apply in seconds" },
  { icon: TrendingUp, title: "Relevance sorting", description: "Sort by newest or relevance. Our scoring surfaces the most relevant contracts for your skills right at the top.", highlight: "Smart, not just fast" },
  { icon: Shield, title: "Save & bookmark", description: "Bookmark contracts you're interested in and revisit them anytime from your saved jobs. Build a shortlist with one click.", highlight: "Stay organised" },
];

const testimonials = [
  { quote: "I landed a £650/day Python contract within 3 days of signing up. ContractHub had the listing 4 hours before I saw it anywhere else.", name: "James R.", role: "Data Engineer · London", stars: 5 },
  { quote: "The alerts are a game changer. I set up a 'DevOps' alert on Monday and had three interviews booked by Wednesday. Can't recommend it enough.", name: "Sarah M.", role: "DevOps Consultant · Manchester", stars: 5 },
  { quote: "Tried three other contract boards before this. None of them had listings this fresh. The 10-minute update cycle is the real deal.", name: "Tom K.", role: "Solutions Architect · Edinburgh", stars: 5 },
];

const faqs = [
  { q: "How is ContractHub different from free job boards?", a: "Most job boards update once or twice a day. ContractHub scrapes 500+ sources every 10 minutes, so you see roles hours before the competition — and you get full details without clicking through." },
  { q: "Who is ContractHub Pro for?", a: "Any UK IT contractor who's tired of applying late and missing roles. Whether you're in Data, DevOps, Cloud, Development, or any other tech discipline — if you're contracting, you need to be first." },
  { q: "Can I cancel at any time?", a: "Absolutely. Cancel your Pro subscription anytime from the billing portal in your account settings. No questions asked, no hidden fees." },
  { q: "How quickly will I get access after subscribing?", a: "Instantly. As soon as your payment is confirmed, your account is upgraded to Pro and all contract details are unlocked." },
  { q: "Is there a free plan?", a: "Yes — you can browse contract titles and dates for free. Upgrade to Pro to unlock full company details, descriptions, alerts, and one-click apply." },
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
    <section className="bg-[hsl(217,91%,50%)] py-14">
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
            <p className="mt-2 text-sm text-white/70 font-medium">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeatureCard({ feature, index }: { feature: typeof features[0]; index: number }) {
  const { ref, visible } = useScrollReveal();
  return (
    <div ref={ref} className="group relative rounded-2xl border bg-card p-6 hover:border-primary/40 hover:shadow-brand transition-all duration-500"
      style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(32px)", transition: "opacity 0.6s ease, transform 0.6s ease", transitionDelay: `${index * 80}ms` }}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
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
    <div ref={ref} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 flex flex-col gap-4"
      style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(24px)", transition: "opacity 0.6s ease, transform 0.6s ease", transitionDelay: `${index * 120}ms` }}
    >
      <div className="flex gap-0.5">{Array.from({ length: t.stars }).map((_, i) => <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />)}</div>
      <p className="text-sm text-white/80 leading-relaxed italic">"{t.quote}"</p>
      <div className="mt-auto pt-4 border-t border-white/10">
        <p className="font-semibold text-sm text-white">{t.name}</p>
        <p className="text-xs text-white/50">{t.role}</p>
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
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [heroSearch, setHeroSearch] = useState("");
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
    const q = (term ?? heroSearch).trim();
    if (user) navigate(q ? `/contracts?q=${encodeURIComponent(q)}` : "/contracts");
    else navigate(q ? `/search-preview?q=${encodeURIComponent(q)}` : "/search-preview");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="ContractHub — The UK's #1 IT Contract Search Engine"
        description="Find your next IT contract in the UK. ContractHub aggregates thousands of contract roles from hundreds of sources, updated in real-time. Search by role, location, and rate."
        canonical="/"
        jsonLd={{ "@context": "https://schema.org", "@type": "WebSite", "name": "ContractHub", "url": "https://contracthub.co.uk", "description": "The UK's #1 IT contract search engine.", "potentialAction": { "@type": "SearchAction", "target": "https://contracthub.co.uk/contracts?q={search_term_string}", "query-input": "required name=search_term_string" } }}
      />
      <Navbar />

      {/* ── 1. HERO — dark ───────────────────────────────── */}
      <section className="relative overflow-hidden bg-[hsl(220,25%,8%)] text-white">
        {/* Ambient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-primary/20 blur-[120px] animate-pulse" />
          <div className="absolute -bottom-20 -left-40 h-[400px] w-[400px] rounded-full bg-primary/10 blur-[100px]" style={{ animation: "pulse 4s ease-in-out infinite 1.5s" }} />
        </div>

        <div className="container relative pt-16 pb-8 md:pt-24 md:pb-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary mb-6 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                The UK's #1 Contract Search Engine
              </div>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-heading font-bold leading-[1.05] tracking-tight text-white">
                Find your next<br />
                <RotatingText /><br />
                contract now
              </h1>
              <p className="mt-6 text-lg md:text-xl text-white/60 max-w-xl leading-relaxed">
                We pull contract opportunities from hundreds of websites every 10 mins ready for you to apply early with no hassle.
              </p>
              <p className="mt-5 text-2xl md:text-3xl font-heading font-bold text-white" ref={heroCountUp.ref}>
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
                    className="border border-white/20 bg-white/5 text-white hover:bg-white/10 backdrop-blur-sm"
                  >
                    Log In <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Right: search card — glass style */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-2xl p-6">
              <p className="font-heading font-bold text-lg text-white mb-1">Search contracts</p>
              <p className="text-sm text-white/50 mb-4">Find your next role by keyword, skill or technology</p>
              <form onSubmit={(e) => { e.preventDefault(); handleHeroSearch(); }} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <Input
                    placeholder="e.g. Python, AWS, DevOps..."
                    className="pl-9 bg-white/10 border-white/10 text-white placeholder:text-white/30 focus:border-primary focus:bg-white/15"
                    value={heroSearch}
                    onChange={(e) => setHeroSearch(e.target.value)}
                  />
                </div>
                <Button type="submit" variant="hero">Search</Button>
              </form>
              <div className="mt-4">
                <p className="text-xs text-white/30 mb-2">Popular searches</p>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_SEARCHES.map((s) => (
                    <button key={s} type="button" onClick={() => handleHeroSearch(s)}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/60 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                    >{s}</button>
                  ))}
                </div>
              </div>
              <div className="mt-5 flex items-center gap-2 text-xs text-white/30 border-t border-white/10 pt-4">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                Updated every 10 minutes from 500+ sources
              </div>
            </div>
          </div>
        </div>

        {/* Skills ticker */}
        <div className="relative overflow-hidden mt-8 pb-10">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 w-24 z-10 bg-gradient-to-r from-[hsl(220,25%,8%)] to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-24 z-10 bg-gradient-to-l from-[hsl(220,25%,8%)] to-transparent" />
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
                <span key={i} className="shrink-0 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/50 whitespace-nowrap">{skill}</span>
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

      {/* ── 4. THE PROBLEM — surface-subtle (pale blue-grey) */}
      <section className="bg-surface-subtle border-y py-20">
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
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg} ${color} mb-3`}><Icon className="h-5 w-5" /></div>
                <p className={`text-2xl font-heading font-bold ${color} mb-1`}>{value}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

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
      <section className="bg-[hsl(220,25%,8%)] py-24 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[400px] w-[700px] rounded-full bg-primary/10 blur-[120px]" />
        </div>
        <div className="container relative">
          <div className="text-center max-w-xl mx-auto mb-14">
            <Badge className="mb-4 text-xs uppercase tracking-widest font-semibold bg-white/10 text-white border-white/10 hover:bg-white/10">Real contractors. Real results.</Badge>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-white">Contractors landing roles every week</h2>
            <p className="mt-3 text-white/50">Don't take our word for it — here's what Pro members say.</p>
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
            <p className="text-xs font-semibold uppercase tracking-widest text-white/60 mb-1">ContractHub Pro</p>
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
            <Button asChild size="lg" className="w-full bg-white text-primary hover:bg-white/90 font-semibold rounded-xl h-12">
              <Link to="/upgrade"><CreditCard className="h-4 w-4 mr-2" />Get Pro Access</Link>
            </Button>
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
      <section className="bg-[hsl(220,25%,8%)] text-white py-28 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[400px] w-[700px] rounded-full bg-primary/15 blur-[100px]" />
        </div>
        <div className="container relative text-center max-w-2xl">
          <h2 className="text-4xl md:text-5xl font-heading font-bold mb-6 leading-tight">
            The best contracts{" "}
            <span className="text-primary">don't wait.</span>
            <br />Neither should you.
          </h2>
          <p className="text-white/60 text-lg mb-10">Join thousands of UK contractors who find roles faster and apply earlier with ContractHub.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" size="lg" onClick={handleExplore}
              className="text-base px-10 h-14 rounded-xl shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all hover:scale-105"
            >
              {user ? "Browse Contracts" : "Get Started Free"} <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            {!isPro && (
              <Button asChild size="lg"
                className="text-base px-10 h-14 rounded-xl border border-white/20 bg-white/5 text-white hover:bg-white/10 backdrop-blur-sm"
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
