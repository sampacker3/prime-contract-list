import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import AuthModal from "@/components/AuthModal";
import { useAuth } from "@/contexts/AuthContext";
import { Search, ArrowRight, Bell, FileText, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import RotatingText from "@/components/RotatingText";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { supabase } from "@/lib/supabase";
import type { Contract } from "@/types/database";

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return { ref, visible };
}

function useCountUp(target: number, duration = 1800) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            setCount(Math.floor(progress * target));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return { count, ref };
}

const steps = [
  {
    icon: Search,
    title: "We search hundreds of businesses and recruiters for contracts",
    description: "We scrape contracts from hundreds of job boards and company sites so you don't have to.",
  },
  {
    icon: Bell,
    title: "We notify you as soon as a relevant contract is posted",
    description: "No more hunting and missing opportunities because you are too late.",
  },
  {
    icon: FileText,
    title: "We draft a cover letter based on your CV and the selected contract",
    description: "Create tailored applications every time, saving you time and improving your application.",
  },
  {
    icon: Send,
    title: "You apply to your ideal contract",
    description: "That hard work has been done, all you need to do is apply with your custom cover letter to your contract early thanks to ContractHub.",
  },
];

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
      {/* Title — always visible */}
      <p className="font-heading font-semibold text-sm text-foreground leading-snug line-clamp-2 mb-2">
        {contract.JobTitle ?? "Contract Role"}
      </p>
      {/* Work type — always visible */}
      {contract.WorkType && (
        <p className="text-xs font-semibold text-primary mb-3">{contract.WorkType}</p>
      )}

      {unlocked ? (
        <div className="space-y-1">
          {contract.Company && <p className="text-xs text-muted-foreground truncate">{contract.Company}</p>}
          {contract.Location && <p className="text-xs text-muted-foreground truncate">{contract.Location}</p>}
          {contract.Description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{contract.Description}</p>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-1.5 blur-[4px] opacity-40 pointer-events-none">
            <p className="text-xs text-muted-foreground truncate">{contract.Company ?? "Company Ltd"}</p>
            <p className="text-xs text-muted-foreground truncate">{contract.Location ?? "United Kingdom"}</p>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{contract.Description ?? "Full details available after sign up..."}</p>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs text-primary/60 font-medium">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" /></svg>
            {lockLabel}
          </div>
        </>
      )}

      {/* Hover overlay */}
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
    if (isPro) {
      navigate(`/contract/${contractId}`);
    } else if (user) {
      navigate("/account");
    } else {
      setShowAuthModal(true);
    }
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
          <div
            className="flex gap-4 mb-4"
            style={{ animation: "marquee-left 70s linear infinite", width: "max-content", animationPlayState: paused ? "paused" : "running" }}
          >
            {[...row1, ...row1, ...row1].map((c, i) => (
              <ContractCard
                key={i} contract={c} unlocked={unlocked}
                lockLabel={user ? "Pro plan required" : "Sign up to view"}
                actionLabel={user ? "Upgrade to Pro →" : "Sign Up →"}
                onHover={() => setPaused(true)}
                onLeave={() => setPaused(false)}
                onAction={() => handleAction(c.id)}
              />
            ))}
          </div>
          <div
            className="flex gap-4"
            style={{ animation: "marquee-right 85s linear infinite", width: "max-content", animationPlayState: paused ? "paused" : "running" }}
          >
            {[...row2, ...row2, ...row2].map((c, i) => (
              <ContractCard
                key={i} contract={c} unlocked={unlocked}
                lockLabel={user ? "Pro plan required" : "Sign up to view"}
                actionLabel={user ? "Upgrade to Pro →" : "Sign Up →"}
                onHover={() => setPaused(true)}
                onLeave={() => setPaused(false)}
                onAction={() => handleAction(c.id)}
              />
            ))}
          </div>
        </div>
      )}
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
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </section>
  );
}

function StatCounter({ target, prefix = "", suffix = "", duration = 1800 }: {
  target: number; prefix?: string; suffix?: string; duration?: number;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const raw = Math.min((now - start) / duration, 1);
            // ease-out cubic
            const progress = 1 - Math.pow(1 - raw, 3);
            setCount(Math.floor(progress * target));
            if (raw < 1) requestAnimationFrame(tick);
            else setCount(target);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  const formatted = count.toLocaleString("en-GB");
  return <span ref={ref}>{prefix}{formatted}{suffix}</span>;
}

function StepItem({ step, index, isLast }: { step: typeof steps[0]; index: number; isLast: boolean }) {
  const { ref, visible } = useScrollReveal();
  return (
    <div ref={ref}>
      {/* Card */}
      <div
        className="rounded-xl border bg-card p-6 flex gap-5 items-start transition-all duration-700"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(24px)",
          transitionDelay: `${index * 150}ms`,
        }}
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-heading font-bold text-lg">
          {index + 1}
        </div>
        <div className="flex-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-primary mb-3">
            <step.icon className="h-5 w-5" />
          </div>
          <h3 className="font-heading font-semibold text-foreground text-lg leading-snug">{step.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{step.description}</p>
        </div>
      </div>

      {/* Dotted connector between cards — ml-12 = p-6 (24px) + half circle (24px) */}
      {!isLast && (
        <div className="ml-12 py-1">
          <div className="border-l-2 border-dashed border-primary/30 h-8" />
        </div>
      )}
    </div>
  );
}

const POPULAR_SEARCHES = ["Python", "AWS", "React", "DevOps", "Data Engineer", "Azure", "Java", "MLOps"];

const Index = () => {
  const { user, isPro } = useAuth();
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [heroSearch, setHeroSearch] = useState("");
  const { count, ref: countRef } = useCountUp(700);

  const handleExplore = () => {
    if (isPro) navigate("/contracts");
    else if (user) navigate("/contracts"); // free user — will see upgrade prompts inline
    else setShowAuthModal(true);
  };

  const handleHeroSearch = (term?: string) => {
    const q = (term ?? heroSearch).trim();
    if (isPro) {
      navigate(q ? `/contracts?q=${encodeURIComponent(q)}` : "/contracts");
    } else if (user) {
      // Free logged-in user — show contracts page with upgrade prompts
      navigate(q ? `/contracts?q=${encodeURIComponent(q)}` : "/contracts");
    } else {
      navigate(q ? `/search-preview?q=${encodeURIComponent(q)}` : "/search-preview");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="ContractHub — The UK's #1 IT Contract Search Engine"
        description="Find your next IT contract in the UK. ContractHub aggregates thousands of contract roles from hundreds of sources, updated in real-time. Search by role, location, and rate."
        canonical="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "ContractHub",
          "url": "https://contracthub.co.uk",
          "description": "The UK's #1 IT contract search engine.",
          "potentialAction": {
            "@type": "SearchAction",
            "target": "https://contracthub.co.uk/contracts?q={search_term_string}",
            "query-input": "required name=search_term_string"
          }
        }}
      />
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pb-10">
        <div className="absolute inset-0 bg-surface-subtle" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(217_91%_50%/0.08),transparent_60%)]" />
        <div className="container relative pt-16 pb-8 md:pt-24 md:pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* Left: headline + buttons */}
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-4">
                The UK's #1 Contract Search Engine
              </p>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-heading font-bold leading-[1.1] text-foreground">
                Find your next<br />
                <RotatingText /><br />
                contract now
              </h1>
              <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed">
                We pull contract opportunities from hundreds of websites every 10 mins ready for you to apply early with no hassle.
              </p>
              <p className="mt-6 text-2xl md:text-3xl font-heading font-bold text-foreground" ref={countRef}>
                Over{" "}
                <span className="text-primary underline decoration-primary decoration-2 underline-offset-4">
                  {count}
                </span>
                {" "}contracts in the past month
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Button variant="hero" size="lg" onClick={handleExplore}>
                  Explore Contracts <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
                {!user && (
                  <Button variant="hero-outline" size="lg" onClick={() => setShowAuthModal(true)}>
                    Log In <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Right: search card */}
            <div className="rounded-2xl border bg-card/80 backdrop-blur-sm shadow-xl p-6">
              <p className="font-heading font-bold text-lg text-foreground mb-1">Search contracts</p>
              <p className="text-sm text-muted-foreground mb-4">Find your next role by keyword, skill or technology</p>
              <form
                onSubmit={(e) => { e.preventDefault(); handleHeroSearch(); }}
                className="flex gap-2"
              >
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="e.g. Python, AWS, DevOps..."
                    className="pl-9"
                    value={heroSearch}
                    onChange={(e) => setHeroSearch(e.target.value)}
                  />
                </div>
                <Button type="submit" variant="hero">
                  Search
                </Button>
              </form>

              {/* Popular searches */}
              <div className="mt-4">
                <p className="text-xs text-muted-foreground mb-2">Popular searches</p>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_SEARCHES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleHeroSearch(s)}
                      className="rounded-full border bg-accent px-3 py-1 text-xs font-medium text-foreground/80 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live count hint */}
              <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground border-t pt-4">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                Updated every 10 minutes from 500+ sources
              </div>
            </div>

          </div>
          {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
        </div>

        {/* Skills ticker — full width inside hero */}
        <div className="relative overflow-hidden mt-8">
          <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-24 z-10 bg-gradient-to-r from-[hsl(214,100%,97%)] to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-24 z-10 bg-gradient-to-l from-[hsl(214,100%,97%)] to-transparent" />
          <div
            className="flex gap-3"
            style={{ animation: "marquee-left 65s linear infinite", width: "max-content" }}
          >
            {[
              "Python", "MLOps", "Machine Learning", "AI / LLMs", "Data Engineer", "BI Developer",
              "Network Engineer", "Solutions Architect", "Java", "C++", "Ruby", "Liquid", "GCP",
              "AWS", "Azure", "SQL", "DevOps", "Kubernetes", "Terraform", "React", "TypeScript",
              "Node.js", "Golang", "Rust", "Scala", "Spark", "Kafka", "Snowflake", "dbt",
              "Power BI", "Tableau", "Salesforce", "SAP", "iOS / Swift", "Android / Kotlin",
              "Cyber Security", "Penetration Testing", "Cloud Architecture", "Site Reliability",
              "Python", "MLOps", "Machine Learning", "AI / LLMs", "Data Engineer", "BI Developer",
              "Network Engineer", "Solutions Architect", "Java", "C++", "Ruby", "Liquid", "GCP",
              "AWS", "Azure", "SQL", "DevOps", "Kubernetes", "Terraform", "React", "TypeScript",
              "Node.js", "Golang", "Rust", "Scala", "Spark", "Kafka", "Snowflake", "dbt",
              "Power BI", "Tableau", "Salesforce", "SAP", "iOS / Swift", "Android / Kotlin",
              "Cyber Security", "Penetration Testing", "Cloud Architecture", "Site Reliability",
            ].map((skill, i) => (
              <span
                key={i}
                className="shrink-0 rounded-full border bg-accent px-4 py-1.5 text-xs font-medium text-foreground/80 whitespace-nowrap"
              >
                {skill}
              </span>
            ))}
          </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y bg-background">
        <div className="container py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { node: <StatCounter target={12400} suffix="+" />, label: "Active Contracts" },
            { node: <StatCounter target={500} suffix="+" />, label: "Sources Scraped" },
            { node: <>{"< 5 min"}</>, label: "Listing Delay" },
            { node: <StatCounter target={8200} suffix="+" />, label: "Happy Users" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-2xl md:text-3xl font-heading font-bold text-foreground">{stat.node}</p>
              <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <ContractMarquee />

      {/* How it works */}
      <section className="container py-20 md:py-28">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-heading font-bold text-foreground">
            The one site to find contracts —{" "}
            <span className="text-primary underline decoration-primary underline-offset-4">now</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Applying early is key to landing contracts, we've got your back.
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          {steps.map((step, i) => (
            <StepItem key={step.title} step={step} index={i} isLast={i === steps.length - 1} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-brand">
        <div className="container py-16 md:py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-primary-foreground">
            Ready to find your next contract?
          </h2>
          <p className="mt-4 text-primary-foreground/80 text-lg max-w-xl mx-auto">
            Join thousands of contractors who use ContractHub to stay ahead of the market.
          </p>
          <Button
            variant="outline"
            size="lg"
            className="mt-8 border-primary-foreground/30 text-primary-foreground bg-primary-foreground/10 hover:bg-primary-foreground/20 font-semibold"
            asChild
          >
            <Link to="/contracts">
              Get Started <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
