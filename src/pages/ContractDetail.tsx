import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Clock, ExternalLink, Lock, Building2, Briefcase, Info, Bookmark, FileText, ChevronRight, Mail, Copy, Check, Sparkles, Loader2 } from "lucide-react";
import { useCvFit } from "@/hooks/useCvFit";
import { useCVExists } from "@/hooks/useCVExists";
import ApplyWithAIButton from "@/components/ApplyWithAIButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AuthModal from "@/components/AuthModal";
import { supabase } from "@/lib/supabase";
import { extractSkills } from "@/lib/skills";
import { useAuth } from "@/contexts/AuthContext";
import { useSavedJobs } from "@/hooks/useSavedJobs";
import type { Contract } from "@/types/database";
import { toast } from "sonner";

// Strip noise words to get meaningful keywords from a job title
const NOISE = new Set([
  "senior", "junior", "lead", "principal", "staff", "associate", "mid", "contract",
  "interim", "remote", "hybrid", "onsite", "uk", "and", "or", "the", "a", "an",
  "with", "in", "for", "of", "to", "at", "role", "position", "opportunity",
]);

function titleKeywords(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !NOISE.has(w))
    .slice(0, 3);
}

function useSimilarContracts(contract: Contract | undefined) {
  return useQuery({
    queryKey: ["similar", contract?.id],
    enabled: !!contract?.JobTitle,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const keywords = titleKeywords(contract!.JobTitle ?? "");
      if (keywords.length === 0) return [];

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);

      const orFilters = keywords
        .map((k) => `JobTitle.ilike.%${k}%`)
        .join(",");

      const { data, error } = await supabase
        .from("LinkedinScrapeResults")
        .select("id, JobTitle, Location, PayRate, IR35Status, created_at")
        .or(orFilters)
        .gte("created_at", cutoff.toISOString())
        .neq("id", contract!.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return (data ?? []) as Pick<Contract, "id" | "JobTitle" | "Location" | "PayRate" | "IR35Status" | "created_at">[];
    },
  });
}

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

function ApplyWithAI({ size = "default", userId, contractId, contract, hasCoverLetter, onCoverLetterCreated }: {
  size?: "sm" | "default";
  userId: string;
  contractId: number;
  contract?: Contract;
  hasCoverLetter: boolean;
  onCoverLetterCreated: () => void;
}) {
  const navigate = useNavigate();

  if (hasCoverLetter) {
    const mailtoHref = contract?.PosterEmail
      ? `mailto:${contract.PosterEmail}?subject=${encodeURIComponent(`Application for ${contract.JobTitle ?? "Contract Role"}`)}&body=${encodeURIComponent(`Hi ${contract.PosterName ? contract.PosterName.split(" ")[0] : "there"},\n\nPlease find my application for the ${contract.JobTitle ?? "contract role"} position below.\n\n[Paste your cover letter here]\n\nI look forward to hearing from you.\n\nKind regards`)}`
      : null;

    return (
      <>
        <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => navigate(`/saved?cover=${contractId}`)}>
          <FileText className="h-3.5 w-3.5 mr-1.5" /> See Cover Letter
        </Button>
        {mailtoHref && (
          <Button variant="hero" size="sm" className="w-full sm:w-auto" asChild>
            <a href={mailtoHref}>
              <Mail className="h-3.5 w-3.5 mr-1.5" /> Send to Recruiter
            </a>
          </Button>
        )}
      </>
    );
  }

  const handleApply = async () => {
    await Promise.all([
      fetch("https://sampacker.app.n8n.cloud/webhook/343e1523-21c4-4010-ba39-aae4d40645b0", {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          user_id: userId,
          contract_id: String(contractId),
          ...(contract?.PosterName ? { poster_name: contract.PosterName } : {}),
          ...(contract?.PosterEmail ? { poster_email: contract.PosterEmail } : {}),
        }),
      }),
      supabase
        .from("UserSavedJobs")
        .upsert({ UserID: userId, JobID: contractId }, { onConflict: "UserID,JobID", ignoreDuplicates: true }),
    ]);

    // Upsert into tracker — upgrade 'saved' → 'applied', or insert fresh
    const { data: existing } = await supabase
      .from("applications")
      .select("id, status")
      .eq("user_id", userId)
      .eq("contract_id", contractId)
      .maybeSingle();

    if (existing) {
      if (existing.status === "saved") {
        await supabase.from("applications").update({ status: "applied", applied_at: new Date().toISOString() }).eq("id", existing.id);
      }
    } else {
      await supabase.from("applications").insert({
        user_id: userId,
        contract_id: contractId,
        job_title: contract?.JobTitle ?? "Untitled Role",
        company: contract?.Company ?? null,
        location: contract?.Location ?? null,
        day_rate: contract?.PayRate ?? null,
        status: "applied",
        applied_at: new Date().toISOString(),
      });
    }

    onCoverLetterCreated();
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
  const [emailCopied, setEmailCopied] = useState(false);

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 2000);
  };

  // 2-second debounce before firing the CV fit API call (avoids cost on quick exits)
  // Reset whenever the contract id changes (same component reused by React Router)
  const [cvFitReady, setCvFitReady] = useState(false);
  useEffect(() => {
    setCvFitReady(false);
    const t = setTimeout(() => setCvFitReady(true), 2000);
    return () => clearTimeout(t);
  }, [id]);

  const queryClient = useQueryClient();
  const { data: contract, isLoading, isError } = useContract(Number(id));
  const { data: similarContracts = [] } = useSimilarContracts(contract);

  // CV fit — must come after useContract so contract is in scope
  const { cvExists: hasCv } = useCVExists();
  const { data: cvFit, isLoading: cvFitLoading } = useCvFit(
    contract?.id ?? null,
    contract?.JobTitle ?? null,
    contract?.Description ?? null,
    cvFitReady && hasCv
  );
  const isToday = contract?.created_at
    ? new Date(contract.created_at) >= new Date(new Date().setHours(0, 0, 0, 0))
    : false;

  // Check if a cover letter already exists for this contract — same query key as SavedJobs
  const { data: coverLetterIds = new Set<number>() } = useQuery({
    queryKey: ['ai-apply-ids', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('UserAIApplyContracts')
        .select('JobID')
        .eq('UserID', user!.id);
      return new Set<number>((data ?? []).map((r: { JobID: number }) => r.JobID));
    },
    staleTime: 60 * 1000,
  });

  const hasCoverLetter = coverLetterIds.has(Number(id));

  const markCoverLetterCreated = () => {
    queryClient.setQueryData(['ai-apply-ids', user?.id], (prev: Set<number>) => {
      const next = new Set(prev);
      next.add(Number(id));
      return next;
    });
    navigate('/tracker');
  };

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
            <div className="p-5 md:p-6 border-b">

              {/* Row 1: Title full-width + bookmark pinned top-right */}
              <div className="flex items-start gap-2 mb-2">
                <h1 className="font-heading font-bold text-xl md:text-2xl text-foreground leading-snug flex-1 min-w-0">
                  {contract.JobTitle ?? "Contract Role"}
                </h1>
                {isPro && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 shrink-0 mt-0.5 ${savedJobIds.has(contract.id) ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
                    onClick={() => toggleSave.mutate(contract.id)}
                    title={savedJobIds.has(contract.id) ? "Remove from saved" : "Save contract"}
                  >
                    <Bookmark className={`h-4 w-4 ${savedJobIds.has(contract.id) ? "fill-current" : ""}`} />
                  </Button>
                )}
              </div>

              {/* Badges row — sits below title */}
              <div className="flex flex-wrap items-center gap-1.5 mb-3">
                {isToday && <Badge className="bg-green-500 text-white border-0 text-[11px]">New</Badge>}
                {isPro && contract.PayRate && (
                  <span className="inline-flex items-center rounded-full bg-green-500/10 border border-green-500/20 px-2 py-0.5 text-xs font-semibold text-green-600 dark:text-green-400">
                    {contract.PayRate}
                  </span>
                )}
              </div>

              {/* Row 2: Meta — company, location, IR35, posted */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground mb-3">
                {isPro ? (
                  <>
                    {contract.Company && <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5 shrink-0" />{contract.Company}</span>}
                    {contract.Location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 shrink-0" />{contract.Location}</span>}
                    {contract.IR35Status && <span>{contract.IR35Status}</span>}
                    {contract.WorkType && <span>{contract.WorkType}</span>}
                  </>
                ) : (
                  <span className="blur-sm select-none opacity-50">████████ Ltd · London, UK · Contract</span>
                )}
                {contract.created_at && (
                  <span className="text-xs text-muted-foreground/70">{formatPostedDate(contract.created_at)}</span>
                )}
              </div>

              {/* Row 3: Skill chips */}
              {(() => {
                const skills = extractSkills(contract.JobTitle, contract.Description);
                return skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {skills.map((skill) => (
                      <span key={skill} className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-primary/80">
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : null;
              })()}

              {/* Row 4: Actions */}
              {isPro && (
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
                  {contract.URL && (
                    <Button variant="hero" size="sm" className="w-full sm:w-auto" asChild>
                      <a href={contract.URL} target="_blank" rel="noopener noreferrer">
                        Apply Now <ExternalLink className="ml-1 h-3.5 w-3.5" />
                      </a>
                    </Button>
                  )}
                  <ApplyWithAI
                    size="sm"
                    userId={user.id}
                    contractId={contract.id}
                    contract={contract}
                    hasCoverLetter={hasCoverLetter}
                    onCoverLetterCreated={markCoverLetterCreated}
                  />
                  <Link to="/about-apply-with-ai" className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <Info className="h-3 w-3" /> What is Apply with AI?
                  </Link>
                </div>
              )}

              {/* Row 5: Recruiter contact — compact strip */}
              {isPro && contract.PosterEmail && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                      <div className="min-w-0">
                        <span className="text-sm text-foreground font-medium">{contract.PosterName ?? "Recruiter"}</span>
                        <span className="text-sm text-muted-foreground ml-2 hidden sm:inline">{contract.PosterEmail}</span>
                        <p className="text-xs text-muted-foreground sm:hidden truncate">{contract.PosterEmail}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => copyEmail(contract.PosterEmail!)}>
                        {emailCopied ? <><Check className="h-3 w-3 mr-1 text-green-500" />Copied</> : <><Copy className="h-3 w-3 mr-1" />Copy</>}
                      </Button>
                      <Button variant="hero" size="sm" className="h-7 text-xs shrink-0" asChild>
                        <a href={`mailto:${contract.PosterEmail}?subject=${encodeURIComponent(`Application for ${contract.JobTitle ?? "Contract Role"}`)}&body=${encodeURIComponent(`Hi ${contract.PosterName ? contract.PosterName.split(" ")[0] : "there"},\n\nI am writing to express my interest in the ${contract.JobTitle ?? "contract role"} position.\n\n`)}`}>
                          <Mail className="h-3 w-3 mr-1" />Email Recruiter
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* CV Fit Score — Pro users with CV only */}
            {isPro && hasCv && (
              <div className="border-b px-5 py-3 bg-primary/3">
                {cvFitLoading ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    Analysing your CV fit…
                  </div>
                ) : cvFit ? (
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Score ring */}
                    <div className={`flex items-center gap-1.5 font-heading font-bold text-sm shrink-0 ${
                      cvFit.score >= 70 ? "text-green-600 dark:text-green-400"
                      : cvFit.score >= 40 ? "text-amber-600 dark:text-amber-400"
                      : "text-red-500"
                    }`}>
                      <Sparkles className="h-3.5 w-3.5" />
                      {cvFit.score}% fit
                    </div>
                    {/* Progress bar */}
                    <div className="flex-1 min-w-[80px] max-w-[120px] h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          cvFit.score >= 70 ? "bg-green-500"
                          : cvFit.score >= 40 ? "bg-amber-500"
                          : "bg-red-500"
                        }`}
                        style={{ width: `${cvFit.score}%` }}
                      />
                    </div>
                    {/* Summary */}
                    <p className="text-xs text-muted-foreground flex-1 min-w-0">{cvFit.summary}</p>
                  </div>
                ) : null}
              </div>
            )}

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

        {/* Similar contracts */}
        {similarContracts.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-heading font-semibold text-foreground text-base">
                Similar roles posted this month
                <span className="ml-2 text-xs font-normal text-muted-foreground">({similarContracts.length})</span>
              </h2>
              <Link
                to="/contracts"
                className="text-xs text-primary hover:underline flex items-center gap-0.5"
              >
                Browse all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {similarContracts.map((s) => {
                const postedToday =
                  s.created_at
                    ? new Date(s.created_at) >= new Date(new Date().setHours(0, 0, 0, 0))
                    : false;
                return (
                  <Link
                    key={s.id}
                    to={`/contract/${s.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 hover:border-primary/30 hover:shadow-brand transition-all group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {s.JobTitle ?? "Contract Role"}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        {s.Location && (
                          <span className="flex items-center gap-0.5 truncate max-w-[140px]">
                            <MapPin className="h-3 w-3 shrink-0" />{s.Location}
                          </span>
                        )}
                        {s.IR35Status && <span>{s.IR35Status}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {s.PayRate && (
                        <span className="inline-flex items-center rounded-full bg-green-500/10 border border-green-500/20 px-2 py-0.5 text-xs font-semibold text-green-600 dark:text-green-400">
                          {s.PayRate}
                        </span>
                      )}
                      {postedToday && (
                        <span className="inline-flex items-center rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                          New
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </main>

      <Footer />
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </div>
  );
}
