import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Clock, ExternalLink, Lock, Building2, Briefcase, Info, Bookmark } from "lucide-react";
import ApplyWithAIButton from "@/components/ApplyWithAIButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AuthModal from "@/components/AuthModal";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useSavedJobs } from "@/hooks/useSavedJobs";
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

function ApplyWithAI({ size = "default", userId, contractId }: { size?: "sm" | "default"; userId: string; contractId: number }) {
  const navigate = useNavigate();

  const handleApply = async () => {
    await Promise.all([
      fetch("https://sampacker.app.n8n.cloud/webhook/343e1523-21c4-4010-ba39-aae4d40645b0", {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ user_id: userId, contract_id: String(contractId) }),
      }),
      supabase
        .from("UserSavedJobs")
        .upsert({ UserID: userId, JobID: contractId }, { onConflict: "UserID,JobID", ignoreDuplicates: true }),
    ]);
  };

  return (
    <ApplyWithAIButton
      size={size}
      onClick={handleApply}
      doneLabel="Success — See Cover Letter"
      onDoneClick={() => navigate(`/saved?cover=${contractId}`)}
    />
  );
}

export default function ContractDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isPro } = useAuth();
  const { savedJobIds, toggleSave } = useSavedJobs();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const { data: contract, isLoading, isError } = useContract(Number(id));
  const isToday = contract?.created_at
    ? new Date(contract.created_at) >= new Date(new Date().setHours(0, 0, 0, 0))
    : false;

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

      <main className="flex-1 container py-4 md:py-8 max-w-3xl">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3 md:mb-6 transition-colors"
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
              <div className="flex flex-col gap-4">
                {/* Title + pay rate + badge */}
                <div className="flex items-start gap-2 flex-wrap">
                  <h1 className="font-heading font-bold text-2xl text-foreground leading-snug">
                    {contract.JobTitle ?? "Contract Role"}
                  </h1>
                  {isPro && contract.PayRate && (
                    <span className="inline-flex items-center rounded-full bg-green-500/10 border border-green-500/20 px-2 py-0.5 text-xs font-semibold text-green-600 dark:text-green-400 shrink-0 mt-1">
                      {contract.PayRate}
                    </span>
                  )}
                  {isToday && (
                    <Badge className="bg-green-500 text-white border-0 shrink-0 mt-1">Posted Today</Badge>
                  )}
                </div>

                {/* Meta info */}
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
                      {contract.IR35Status && (
                        <span className="flex items-center gap-1.5">
                          {contract.IR35Status}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="blur-sm select-none opacity-50">████████ Ltd · London, UK · Contract</span>
                  )}
                  {contract.created_at && (
                    <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatPostedDate(contract.created_at)}
                    </span>
                  )}
                </div>

                {/* Action buttons */}
                {isPro && (
                  <div className="flex flex-wrap items-center gap-2">
                    {contract.URL && (
                      <Button variant="hero" size="sm" asChild>
                        <a href={contract.URL} target="_blank" rel="noopener noreferrer">
                          Apply Now <ExternalLink className="ml-1 h-3.5 w-3.5" />
                        </a>
                      </Button>
                    )}
                    <ApplyWithAI size="sm" userId={user.id} contractId={contract.id} />
                    <Button
                      variant="ghost"
                      size="icon"
                      className={savedJobIds.has(contract.id) ? "text-primary" : "text-muted-foreground hover:text-primary"}
                      onClick={() => toggleSave.mutate(contract.id)}
                      title={savedJobIds.has(contract.id) ? "Remove from saved" : "Save contract"}
                    >
                      <Bookmark className={`h-4 w-4 ${savedJobIds.has(contract.id) ? "fill-current" : ""}`} />
                    </Button>
                    <Link
                      to="/about-apply-with-ai"
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Info className="h-3 w-3" />
                      What is Apply with AI?
                    </Link>
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
