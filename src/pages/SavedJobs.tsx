import { MapPin, Clock, ExternalLink, Bookmark, Loader2, Search, ChevronDown, ChevronUp, ArrowRight, FileText, X, Copy, Check, ClipboardList, Mail, Download } from "lucide-react";
import ApplyWithAIButton from "@/components/ApplyWithAIButton";
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { useSavedJobs } from "@/hooks/useSavedJobs";
import { useApplications, type ApplicationStatus } from "@/hooks/useApplications";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

function CoverLetterModal({ contractId, jobTitle, posterEmail, posterName, onClose }: {
  contractId: number;
  jobTitle: string | null;
  posterEmail?: string | null;
  posterName?: string | null;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [letter, setLetter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cvUrl, setCvUrl] = useState<string | null>(null);

  useState(() => {
    if (!user) return;

    // Fetch cover letter
    supabase
      .from("UserAIApplyContracts")
      .select("*")
      .eq("UserID", user.id)
      .eq("JobID", contractId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (err || !data) { setError(true); setLoading(false); return; }
        const text =
          data.CoverLetter ?? data.cover_letter ??
          data.Content ?? data.content ??
          data.Letter ?? data.letter ?? null;
        setLetter(text);
        setLoading(false);
      });

    // Fetch signed CV download URL
    supabase.storage
      .from("cvs")
      .createSignedUrl(`${user.id}/cv.pdf`, 3600)
      .then(({ data }) => {
        if (data?.signedUrl) setCvUrl(data.signedUrl);
      });
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl bg-card border shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <p className="font-heading font-semibold text-foreground text-sm">AI Cover Letter</p>
              {jobTitle && <p className="text-xs text-muted-foreground truncate max-w-xs">{jobTitle}</p>}
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 flex-1">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
          {!loading && error && (
            <p className="text-sm text-muted-foreground text-center py-12">
              No cover letter found for this contract yet.
            </p>
          )}
          {!loading && !error && letter && (
            <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{letter}</p>
          )}
          {!loading && !error && !letter && (
            <p className="text-sm text-muted-foreground text-center py-12">
              Cover letter content is empty.
            </p>
          )}
        </div>

        {/* Footer */}
        {!loading && letter && (
          <div className="px-6 py-4 border-t shrink-0 space-y-3">
            {/* Send to recruiter — only shown when email is known */}
            {posterEmail && (
              <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
                <Mail className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {posterName ?? "Recruiter"} · <span className="text-muted-foreground">{posterEmail}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Your email client will open with the cover letter pre-filled — attach your CV before sending.</p>
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {posterEmail && (
                <Button variant="hero" size="sm" asChild>
                  <a href={`mailto:${posterEmail}?subject=${encodeURIComponent(`Application for ${jobTitle ?? "Contract Role"}`)}&body=${encodeURIComponent(letter)}`}>
                    <Mail className="h-3.5 w-3.5 mr-1.5" /> Send to Recruiter
                  </a>
                </Button>
              )}
              {cvUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={cvUrl} download="CV.pdf" target="_blank" rel="noopener noreferrer">
                    <Download className="h-3.5 w-3.5 mr-1.5" /> Download CV
                  </a>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => { navigator.clipboard.writeText(letter); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className={copied ? "text-green-600 border-green-500 hover:text-green-600" : ""}
              >
                {copied ? <><Check className="h-3.5 w-3.5 mr-1.5" />Copied!</> : <><Copy className="h-3.5 w-3.5 mr-1.5" />Copy</>}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function isToday(createdAt: string): boolean {
  const date = new Date(createdAt);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function formatPostedDate(createdAt: string): string {
  const date = new Date(createdAt);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
  const timeStr = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  if (date >= todayStart) return `Today at ${timeStr}`;
  if (date >= yesterdayStart) return `Yesterday at ${timeStr}`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_STYLES: Record<ApplicationStatus, { label: string; className: string }> = {
  saved:     { label: "Saved",     className: "bg-slate-500/10 text-slate-500 border-slate-400/20" },
  applied:   { label: "Applied",   className: "bg-primary/10 text-primary border-primary/20" },
  interview: { label: "Interview", className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  offered:   { label: "Offered",   className: "bg-green-500/10 text-green-600 border-green-500/20" },
};

export default function SavedJobsPage() {
  const { user } = useAuth();
  const { savedContracts, savedLoading, toggleSave, savedJobIds } = useSavedJobs();
  const { applications, addApplication } = useApplications();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [coverLetterId, setCoverLetterId] = useState<number | null>(null);
  const [trackingId, setTrackingId] = useState<number | null>(null);
  const [trackStatus, setTrackStatus] = useState<ApplicationStatus>("applied");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Map contract_id → application for quick lookup
  const appByContractId = new Map(
    applications.filter(a => a.contract_id).map(a => [a.contract_id!, a])
  );

  // Fetch which contracts already have an AI cover letter for this user
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

  // Auto-open cover letter modal if ?cover= param is present
  useEffect(() => {
    const coverId = searchParams.get("cover");
    if (coverId) {
      const id = Number(coverId);
      setCoverLetterId(id);
      setExpandedId(id);
      window.history.replaceState({}, '', '/saved');
    }
  }, [searchParams]);

  const handleApplyWithAI = async (contractId: number) => {
    if (!user) return;
    try {
      await fetch("https://sampacker.app.n8n.cloud/webhook/343e1523-21c4-4010-ba39-aae4d40645b0", {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ user_id: user.id, contract_id: String(contractId) }),
      });
      // Optimistically mark as having a cover letter
      queryClient.setQueryData(['ai-apply-ids', user.id], (prev: Set<number>) => {
        const next = new Set(prev);
        next.add(contractId);
        return next;
      });

      // Auto-add to Application Tracker if not already tracked
      const contract = savedContracts.find(c => c.id === contractId);
      const { data: existing } = await supabase
        .from("applications")
        .select("id")
        .eq("user_id", user.id)
        .eq("contract_id", contractId)
        .maybeSingle();

      if (!existing) {
        await supabase.from("applications").insert({
          user_id: user.id,
          contract_id: contractId,
          job_title: contract?.JobTitle ?? "Untitled Role",
          company: contract?.Company ?? null,
          location: contract?.Location ?? null,
          day_rate: contract?.PayRate ?? null,
          status: "applied",
          applied_at: new Date().toISOString(),
        });
        toast.success("Added to your Application Tracker", { description: contract?.JobTitle ?? undefined });
      }

      setCoverLetterId(contractId);
    } catch {
      // fire-and-forget — ignore errors
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Saved Contracts — IT ContractHub"
        description="Your saved IT contract roles on IT ContractHub."
        canonical="/saved"
        noIndex={true}
      />
      <Navbar />

      <section className="border-b bg-surface-subtle">
        <div className="container py-8">
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">Saved Contracts</h1>
          <p className="mt-2 text-muted-foreground">Contracts you've bookmarked for later.</p>
        </div>
      </section>

      <section className="container py-8 flex-1">
        {savedLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {!savedLoading && savedContracts.length === 0 && (
          <div className="text-center py-20">
            <Bookmark className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-lg font-heading font-semibold text-foreground">No saved contracts yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Bookmark contracts from the{" "}
              <a href="/contracts" className="text-primary hover:underline">Browse Contracts</a>{" "}
              page to see them here.
            </p>
          </div>
        )}

        {!savedLoading && savedContracts.length > 0 && (
          <>
            <p className="text-sm text-muted-foreground mb-6">
              Showing <span className="font-semibold text-foreground">{savedContracts.length}</span> saved contract{savedContracts.length !== 1 ? "s" : ""}
            </p>
            <div className="space-y-3">
              {savedContracts.map((contract) => {
                const postedToday = isToday(contract.created_at);
                const expanded = expandedId === contract.id;
                const trackerApp = appByContractId.get(contract.id);
                const statusStyle = trackerApp ? STATUS_STYLES[trackerApp.status] : null;

                return (
                  <div
                    key={contract.id}
                    className="rounded-xl border bg-card transition-all hover:shadow-brand hover:border-primary/20"
                  >
                    <div className="p-5 cursor-pointer" onClick={() => toggleExpand(contract.id)}>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-heading font-semibold text-foreground truncate">
                              {contract.JobTitle ?? "Untitled Role"}
                            </h3>
                            {postedToday && (
                              <Badge className="text-xs shrink-0 bg-green-500 hover:bg-green-500 text-white border-0">
                                Posted Today
                              </Badge>
                            )}
                            {statusStyle && (
                              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium shrink-0 ${statusStyle.className}`}>
                                <ClipboardList className="h-3 w-3" />
                                {statusStyle.label}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{contract.Company ?? "Company not listed"}</p>
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                            {contract.Location && (
                              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{contract.Location}</span>
                            )}
                            {contract.EmploymentType && (
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{contract.EmploymentType}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatPostedDate(contract.created_at)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-primary"
                            onClick={(e) => { e.stopPropagation(); toggleSave.mutate(contract.id); }}
                          >
                            <Bookmark className="h-4 w-4 fill-current" />
                          </Button>
                          {contract.URL && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-primary"
                              onClick={(e) => { e.stopPropagation(); window.open(contract.URL!, "_blank"); }}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="text-muted-foreground">
                            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {expanded && (
                      <div className="px-5 pb-5 border-t pt-4">
                        {contract.Description ? (
                          <p className="text-sm text-foreground whitespace-pre-line leading-relaxed line-clamp-4 mb-4">
                            {contract.Description}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground italic mb-4">No description available.</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="hero"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); navigate(`/contract/${contract.id}`); }}
                          >
                            See More <ArrowRight className="ml-1 h-3.5 w-3.5" />
                          </Button>
                          {coverLetterIds.has(contract.id) ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); setCoverLetterId(contract.id); }}
                            >
                              <FileText className="h-3.5 w-3.5 mr-1" /> See Cover Letter
                            </Button>
                          ) : (
                            <div onClick={(e) => e.stopPropagation()}>
                              <ApplyWithAIButton
                                size="sm"
                                onClick={() => handleApplyWithAI(contract.id)}
                                doneLabel="Success — See Cover Letter"
                                onDoneClick={() => setCoverLetterId(contract.id)}
                              />
                            </div>
                          )}

                          {/* Tracker — show status or add button */}
                          {trackerApp ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); navigate("/tracker"); }}
                              className={`border ${statusStyle?.className}`}
                            >
                              <ClipboardList className="h-3.5 w-3.5 mr-1" />
                              {statusStyle?.label} — View in Tracker
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); setTrackingId(contract.id); setTrackStatus("applied"); }}
                            >
                              <ClipboardList className="h-3.5 w-3.5 mr-1" /> Add to Tracker
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      <Footer />

      {/* Quick-track modal */}
      {trackingId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setTrackingId(null); }}
        >
          <div className="relative w-full max-w-sm rounded-2xl bg-card border shadow-xl p-6">
            <button onClick={() => setTrackingId(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 mb-1">
              <ClipboardList className="h-4 w-4 text-primary" />
              <h2 className="font-heading font-bold text-foreground">Add to Tracker</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4 truncate">
              {savedContracts.find(c => c.id === trackingId)?.JobTitle ?? ""}
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Status</label>
                <div className="flex rounded-lg border overflow-hidden text-xs font-medium bg-background">
                  {(["applied", "interview", "offered"] as ApplicationStatus[]).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setTrackStatus(s)}
                      className={`flex-1 px-3 py-2 capitalize transition-colors border-r last:border-r-0 ${
                        trackStatus === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {STATUS_STYLES[s].label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <Button variant="outline" className="flex-1" size="sm" onClick={() => setTrackingId(null)}>Cancel</Button>
                <Button
                  variant="hero"
                  className="flex-1"
                  size="sm"
                  disabled={addApplication.isPending}
                  onClick={async () => {
                    const contract = savedContracts.find(c => c.id === trackingId);
                    await addApplication.mutateAsync({
                      contract_id: trackingId,
                      job_title: contract?.JobTitle ?? "Untitled Role",
                      company: contract?.Company ?? undefined,
                      location: contract?.Location ?? undefined,
                      day_rate: contract?.PayRate ?? undefined,
                      status: trackStatus,
                      applied_at: new Date().toISOString(),
                    });
                    setTrackingId(null);
                    toast.success("Added to Tracker");
                  }}
                >
                  {addApplication.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add to Tracker"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {coverLetterId && (() => {
        const c = savedContracts.find(c => c.id === coverLetterId);
        return (
          <CoverLetterModal
            contractId={coverLetterId}
            jobTitle={c?.JobTitle ?? null}
            posterEmail={c?.PosterEmail ?? null}
            posterName={c?.PosterName ?? null}
            onClose={() => setCoverLetterId(null)}
          />
        );
      })()}
    </div>
  );
}
