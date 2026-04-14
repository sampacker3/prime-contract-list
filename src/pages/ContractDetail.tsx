import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Clock, ExternalLink, Lock, Building2, Briefcase, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AuthModal from "@/components/AuthModal";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { Contract } from "@/types/database";

function useContract(id: number) {
  return useQuery({
    queryKey: ["contract", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("LinkedinScrapeResults")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Contract;
    },
    enabled: !!id,
  });
}

function formatPostedDate(createdAt: string): string {
  const date = new Date(createdAt);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  const timeStr = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  if (date >= todayStart) return `Today at ${timeStr}`;
  if (date >= yesterdayStart) return `Yesterday at ${timeStr}`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function ApplyWithAI({ size = "default" }: { size?: "sm" | "default" }) {
  const [hover, setHover] = useState(false);
  const pad = size === "sm" ? "px-3 py-1.5 text-xs gap-1.5" : "px-4 py-2 text-sm gap-2";
  return (
    <>
      {/* Rotating gradient border wrapper */}
      <div
        className="relative shrink-0 rounded-xl p-[1.5px]"
        style={{
          background: "linear-gradient(135deg, #7c3aed, #3b82f6, #06b6d4, #a855f7, #7c3aed)",
          backgroundSize: "300% 300%",
          animation: "ai-border-spin 3s ease infinite",
          boxShadow: hover ? "0 0 16px 2px rgba(139,92,246,0.4), 0 0 32px 4px rgba(59,130,246,0.2)" : "0 0 10px 1px rgba(139,92,246,0.25)",
          transition: "box-shadow 0.3s ease",
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <button
          className={`relative flex items-center font-semibold rounded-[10px] transition-all duration-300 ${pad}`}
          style={{
            background: hover
              ? "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(59,130,246,0.1))"
              : "rgba(139,92,246,0.07)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            color: hover ? "#a78bfa" : "#8b5cf6",
          }}
          onClick={() => alert("AI application feature coming soon!")}
        >
          <Sparkles className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} style={{ filter: "drop-shadow(0 0 4px rgba(139,92,246,0.6))" }} />
          Apply with AI
        </button>
      </div>
    </>
  );
}

export default function ContractDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isPro } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const { data: contract, isLoading, isError } = useContract(Number(id));
  const isToday = contract?.created_at
    ? new Date(contract.created_at) >= new Date(new Date().setHours(0, 0, 0, 0))
    : false;

  // CTA shown inside the locked overlay
  const LockedCTA = () => (
    <div className="text-center mt-4">
      <Lock className="h-6 w-6 text-primary mx-auto mb-2" />
      {user ? (
        <>
          <p className="font-heading font-semibold text-foreground mb-1">Pro plan required</p>
          <p className="text-sm text-muted-foreground mb-4">Upgrade to read full descriptions and apply directly.</p>
          <Button variant="hero" asChild>
            <Link to="/upgrade">Upgrade to Pro</Link>
          </Button>
        </>
      ) : (
        <>
          <p className="font-heading font-semibold text-foreground mb-1">Sign up to read the full description</p>
          <p className="text-sm text-muted-foreground mb-4">Pro plan — takes 30 seconds to get started</p>
          <div className="flex gap-2 justify-center">
            <Button variant="hero" onClick={() => setShowAuthModal(true)}>Sign Up</Button>
            <Button variant="outline" onClick={() => setShowAuthModal(true)}>Log In</Button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 container py-8 max-w-3xl">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {isLoading && (
          <div className="rounded-xl border bg-card p-8 animate-pulse space-y-4">
            <div className="h-7 bg-muted rounded w-2/3" />
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-5/6" />
          </div>
        )}

        {isError && (
          <div className="text-center py-20">
            <p className="font-heading font-semibold text-foreground text-lg">Contract not found</p>
            <p className="text-muted-foreground text-sm mt-1">It may have been removed or expired.</p>
            <Button className="mt-4" onClick={() => navigate("/contracts")}>Browse all contracts</Button>
          </div>
        )}

        {contract && (
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h1 className="font-heading font-bold text-2xl text-foreground leading-snug">
                      {contract.JobTitle ?? "Contract Role"}
                    </h1>
                    {isToday && (
                      <Badge className="bg-green-500 text-white border-0 shrink-0">Posted Today</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {isPro ? (
                      <>
                        {contract.Company && (
                          <span className="flex items-center gap-1.5">
                            <Building2 className="h-4 w-4 shrink-0" />{contract.Company}
                          </span>
                        )}
                        {contract.Location && (
                          <span className="flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 shrink-0" />{contract.Location}
                          </span>
                        )}
                        {contract.EmploymentType && (
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4 shrink-0" />{contract.EmploymentType}
                          </span>
                        )}
                        {contract.WorkType && (
                          <span className="flex items-center gap-1.5">
                            <Briefcase className="h-4 w-4 shrink-0" />{contract.WorkType}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="blur-sm select-none opacity-50">████████ Ltd · London, UK · Contract</span>
                    )}
                    <span className="text-xs">
                      {contract.created_at && formatPostedDate(contract.created_at)}
                    </span>
                  </div>
                </div>

                {isPro && (
                  <div className="flex items-center gap-2 shrink-0">
                    {contract.URL && (
                      <Button variant="hero" size="sm" asChild>
                        <a href={contract.URL} target="_blank" rel="noopener noreferrer">
                          Apply Now <ExternalLink className="ml-1 h-3.5 w-3.5" />
                        </a>
                      </Button>
                    )}
                    <ApplyWithAI size="sm" />
                  </div>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="p-6">
              {isPro ? (
                contract.Description ? (
                  <div>
                    <h2 className="font-heading font-semibold text-foreground mb-3">Job Description</h2>
                    <p className="text-sm text-foreground/80 whitespace-pre-line leading-relaxed">
                      {contract.Description}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No description available for this contract.</p>
                )
              ) : (
                <div>
                  <h2 className="font-heading font-semibold text-foreground mb-3">Job Description</h2>
                  <div className="relative">
                    <div className="blur-sm select-none pointer-events-none space-y-2 opacity-50">
                      {[100, 95, 88, 100, 92, 80, 100, 75, 90, 85].map((w, i) => (
                        <div key={i} className="h-3.5 bg-muted-foreground/30 rounded" style={{ width: `${w}%` }} />
                      ))}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/60 to-card flex flex-col items-center justify-end pb-2">
                      <LockedCTA />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer CTA for Pro users */}
            {isPro && (
              <div className="border-t bg-surface-subtle px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
                <p className="text-sm text-muted-foreground">Ready to apply? Get in early.</p>
                <div className="flex items-center gap-2">
                  {contract.URL && (
                    <Button variant="hero" asChild>
                      <a href={contract.URL} target="_blank" rel="noopener noreferrer">
                        Apply on LinkedIn <ExternalLink className="ml-1 h-3.5 w-3.5" />
                      </a>
                    </Button>
                  )}
                  <ApplyWithAI />
                </div>
              </div>
            )}

            {/* Footer CTA for free logged-in users */}
            {!isPro && user && (
              <div className="border-t bg-surface-subtle px-6 py-4 flex items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">Upgrade to Pro to apply directly to this role.</p>
                <Button variant="hero" asChild>
                  <Link to="/upgrade">Upgrade to Pro</Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </div>
  );
}
