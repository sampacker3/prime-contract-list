import { Link } from "react-router-dom";
import { Search, ArrowRight, Briefcase, Mail, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import RotatingText from "@/components/RotatingText";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const features = [
  {
    icon: Search,
    title: "Hundreds of Sources",
    description: "We scrape contracts from hundreds of job boards and company sites so you don't have to.",
  },
  {
    icon: Zap,
    title: "Real-Time Updates",
    description: "New contracts appear within minutes of being posted. Never miss an opportunity.",
  },
  {
    icon: Mail,
    title: "Instant Email Alerts",
    description: "Set your keywords and get notified the moment matching contracts are listed.",
  },
  {
    icon: Briefcase,
    title: "Advanced Filtering",
    description: "Filter by rate, location, duration, and technology stack to find your perfect contract.",
  },
];

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
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
              Find your next{" "}
              <RotatingText />{" "}
              <br className="hidden sm:block" />
              contract now
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed">
              We aggregate contracts from hundreds of sources so you can focus on landing your next role. Updated in real-time.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button variant="hero" size="lg" asChild>
                <Link to="/contracts">
                  Browse Contracts <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="hero-outline" size="lg" asChild>
                <Link to="/alerts">
                  Set Up Alerts <Mail className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
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

      {/* Features */}
      <section className="container py-20 md:py-28">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground">
            Everything you need to find contracts
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Stop wasting hours searching multiple sites. We do the heavy lifting.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl border bg-card p-6 transition-all hover:shadow-brand hover:border-primary/20"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-primary">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="font-heading font-semibold text-foreground">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
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
