import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import AuthModal from "@/components/AuthModal";
import { useAuth } from "@/contexts/AuthContext";
import { Search, ArrowRight, Bell, FileText, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import RotatingText from "@/components/RotatingText";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

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

const SAMPLE_CONTRACTS = [
  { title: "Senior React Developer", company: "FinTech Solutions Ltd", rate: "£650/day", location: "London (Remote)", desc: "We are looking for an experienced React developer to join our growing team to help build next-generation financial dashboards..." },
  { title: "Python Data Engineer", company: "Lloyds Banking Group", rate: "£550/day", location: "Edinburgh / Hybrid", desc: "Seeking a skilled Python data engineer to design and maintain large-scale data pipelines using Apache Spark and Kafka..." },
  { title: "DevOps Engineer (AWS)", company: "CloudCore Systems", rate: "£700/day", location: "Manchester (Remote)", desc: "We need a DevOps engineer with strong AWS experience to own our CI/CD infrastructure and help migrate legacy services..." },
  { title: "Java Backend Contractor", company: "HSBC Technology", rate: "£600/day", location: "Canary Wharf / Hybrid", desc: "Join a cross-functional squad delivering high-throughput payment processing services built on Java 17 and Spring Boot..." },
  { title: "Scrum Master / Agile Coach", company: "Nationwide Building Society", rate: "£500/day", location: "Swindon (Hybrid)", desc: "Looking for an experienced Scrum Master to lead two delivery squads through an exciting digital transformation programme..." },
  { title: "Full Stack TypeScript Dev", company: "GovTech Innovations", rate: "£575/day", location: "Remote (UK)", desc: "Help us build citizen-facing services using Node.js, React and PostgreSQL. SC clearance eligible candidates preferred..." },
  { title: "Cloud Architect (Azure)", company: "Vodafone Group", rate: "£800/day", location: "Newbury / Remote", desc: "Define and own the Azure cloud strategy for a major network modernisation programme affecting millions of customers..." },
  { title: "iOS Swift Developer", company: "Starling Bank", rate: "£650/day", location: "London (Hybrid)", desc: "Join our mobile team building award-winning banking features for our iOS app used by over 3 million customers daily..." },
  { title: "Business Analyst (Finance)", company: "Barclays Capital", rate: "£525/day", location: "London (Hybrid)", desc: "Support delivery of regulatory change programmes across fixed income and derivatives with strong stakeholder engagement..." },
  { title: "Golang Microservices Dev", company: "Deliveroo Engineering", rate: "£680/day", location: "London / Remote", desc: "Build and scale high-performance microservices in Go that handle millions of order events per day across our platform..." },
  { title: "SAP S/4HANA Consultant", company: "Tata Consultancy Services", rate: "£725/day", location: "Birmingham (Hybrid)", desc: "Drive SAP S/4HANA implementation for a major UK retail client, covering finance and supply chain modules end-to-end..." },
  { title: "Security Engineer (SOC)", company: "BAE Systems Digital", rate: "£600/day", location: "Guildford (SC Cleared)", desc: "Work within a 24/7 security operations centre detecting, triaging and responding to threats across defence networks..." },
  { title: "Machine Learning Engineer", company: "Rolls-Royce R2 Data Labs", rate: "£750/day", location: "Derby / Remote", desc: "Apply ML to predictive maintenance problems on jet engine telemetry data — Python, PyTorch and MLflow environment..." },
  { title: "Salesforce CRM Developer", company: "BT Group", rate: "£500/day", location: "London (Hybrid)", desc: "Develop and maintain Salesforce Sales Cloud and Service Cloud solutions for BT's enterprise B2B customer portfolio..." },
  { title: "Network Engineer (CCNP)", company: "Virgin Media O2", rate: "£475/day", location: "Reading (On-site)", desc: "Responsible for the design, implementation and troubleshooting of core network infrastructure supporting our 5G rollout..." },
  { title: "UX / Product Designer", company: "Monzo Bank", rate: "£550/day", location: "London / Remote", desc: "Shape the future of personal finance by designing intuitive, beautiful experiences for Monzo's 9 million UK customers..." },
];

function ContractCard({ contract }: { contract: typeof SAMPLE_CONTRACTS[0] }) {
  return (
    <div className="w-64 shrink-0 rounded-xl border bg-card p-4 shadow-sm select-none">
      <p className="font-heading font-semibold text-sm text-foreground leading-snug line-clamp-2 mb-2">
        {contract.title}
      </p>
      <div className="space-y-0.5 mb-3 opacity-50">
        <p className="text-xs text-muted-foreground truncate">{contract.company}</p>
        <div className="flex gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-primary/70">{contract.rate}</span>
          <span>·</span>
          <span className="truncate">{contract.location}</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground line-clamp-3 opacity-30 blur-[2px] select-none pointer-events-none">
        {contract.desc}
      </p>
      <div className="mt-3 flex items-center gap-1 text-xs text-primary/60 font-medium">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" /></svg>
        Sign up to view
      </div>
    </div>
  );
}

function ContractMarquee() {
  const half = Math.ceil(SAMPLE_CONTRACTS.length / 2);
  const row1 = SAMPLE_CONTRACTS.slice(0, half);
  const row2 = SAMPLE_CONTRACTS.slice(half);
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
          Sign up to unlock full details, rates, and one-click applications.
        </p>
      </div>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 z-10 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 z-10 bg-gradient-to-l from-background to-transparent" />
        <div className="flex gap-4 mb-4" style={{ animation: "marquee-left 40s linear infinite", width: "max-content" }}>
          {[...row1, ...row1, ...row1].map((c, i) => <ContractCard key={i} contract={c} />)}
        </div>
        <div className="flex gap-4" style={{ animation: "marquee-right 48s linear infinite", width: "max-content" }}>
          {[...row2, ...row2, ...row2].map((c, i) => <ContractCard key={i} contract={c} />)}
        </div>
      </div>
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

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { count, ref: countRef } = useCountUp(700);

  const handleExplore = () => {
    if (user) {
      navigate("/contracts");
    } else {
      setShowAuthModal(true);
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
          <div className="max-w-3xl">
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
              <Button variant="hero-outline" size="lg" onClick={() => setShowAuthModal(true)}>
                Log In <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>

            {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
          </div>
        </div>

        {/* Skills ticker — full width inside hero */}
        <div className="relative overflow-hidden mt-8">
          <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-24 z-10 bg-gradient-to-r from-[hsl(214,100%,97%)] to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-24 z-10 bg-gradient-to-l from-[hsl(214,100%,97%)] to-transparent" />
          <div
            className="flex gap-3"
            style={{ animation: "marquee-left 35s linear infinite", width: "max-content" }}
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
