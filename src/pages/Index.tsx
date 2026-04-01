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
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-surface-subtle" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(217_91%_50%/0.08),transparent_60%)]" />
        <div className="container relative py-24 md:py-36 lg:py-44">
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
      </section>

      {/* Stats bar */}
      <section className="border-y bg-background">
        <div className="container py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: "12,400+", label: "Active Contracts" },
            { value: "500+", label: "Sources Scraped" },
            { value: "< 5 min", label: "Listing Delay" },
            { value: "8,200+", label: "Happy Users" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-2xl md:text-3xl font-heading font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

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
