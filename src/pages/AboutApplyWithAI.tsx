import { Link } from "react-router-dom";
import { ArrowLeft, FileText, Sparkles, Target, CheckCircle2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const steps = [
  {
    icon: FileText,
    title: "Upload your CV",
    description:
      "You upload your CV once to your ContractHub profile. We store it securely so it's ready whenever you find a contract you want to apply to.",
  },
  {
    icon: Target,
    title: "We extract what matters",
    description:
      "Our AI reads both your CV and the contract description, pulling out the skills, experience, and keywords that are most relevant to that specific role.",
  },
  {
    icon: Sparkles,
    title: "Tailored cover letter, instantly",
    description:
      "We generate a cover letter written specifically for that contract — highlighting your matching experience and framing your background in the language the client is looking for.",
  },
  {
    icon: Zap,
    title: "CV improvement suggestions",
    description:
      "Where your CV could be stronger for that role, we'll flag it — missing keywords, skills worth emphasising, or ways to better position your experience for the contract.",
  },
];

const benefits = [
  "No more starting from a blank page for every application",
  "Stand out with a cover letter tailored to each role",
  "Identify skill gaps before you apply",
  "Apply to more contracts in less time",
  "Increase your chances of getting to interview",
];

export default function AboutApplyWithAI() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-surface-subtle border-b py-16">
          <div className="container max-w-3xl">
            <Link
              to="/contracts"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back to contracts
            </Link>
            <div className="flex items-center gap-3 mb-4">
              {/* Gradient icon wrapper matching the button style */}
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: "linear-gradient(135deg, #7c3aed, #3b82f6, #06b6d4)",
                }}
              >
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <h1 className="font-heading font-bold text-3xl text-foreground">Apply with AI</h1>
            </div>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Stop spending hours crafting applications from scratch. Apply with AI takes your CV,
              understands the contract, and does the heavy lifting — so you can apply faster and
              smarter.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section className="py-16 bg-card">
          <div className="container max-w-3xl">
            <h2 className="font-heading font-bold text-2xl text-foreground mb-2">How it works</h2>
            <p className="text-muted-foreground mb-10">Four steps from CV to tailored application.</p>

            <div className="space-y-8">
              {steps.map((step, i) => (
                <div key={i} className="flex gap-4">
                  <div className="shrink-0 flex flex-col items-center">
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center"
                      style={{
                        background: "linear-gradient(135deg, rgba(124,58,237,0.15), rgba(59,130,246,0.1))",
                        border: "1px solid rgba(124,58,237,0.2)",
                      }}
                    >
                      <step.icon className="h-5 w-5 text-primary" />
                    </div>
                    {i < steps.length - 1 && (
                      <div className="w-px flex-1 bg-border mt-2 mb-0 min-h-[2rem]" />
                    )}
                  </div>
                  <div className="pb-6">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Step {i + 1}
                      </span>
                    </div>
                    <h3 className="font-heading font-semibold text-foreground text-lg mb-1">
                      {step.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16 bg-[hsl(var(--surface-subtle))]">
          <div className="container max-w-3xl">
            <h2 className="font-heading font-bold text-2xl text-foreground mb-2">Why it matters</h2>
            <p className="text-muted-foreground mb-8">
              The IT contracting market moves fast. Generic applications get ignored.
            </p>
            <ul className="space-y-3">
              {benefits.map((benefit, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground/80">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-card">
          <div className="container max-w-3xl text-center">
            <h2 className="font-heading font-bold text-2xl text-foreground mb-3">
              Ready to apply smarter?
            </h2>
            <p className="text-muted-foreground mb-6">
              Apply with AI is included in your Pro plan. Browse contracts and hit the button.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Button variant="hero" asChild>
                <Link to="/contracts">Browse contracts</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/upgrade">View Pro plan</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
