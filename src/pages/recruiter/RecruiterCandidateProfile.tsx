import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowLeft, Bookmark, BookmarkCheck, Mail, Download,
  FileText, Loader2, AlertCircle, User, Copy, CheckCircle2,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import RecruiterNavbar from "@/components/RecruiterNavbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useSavedCandidates } from "@/hooks/useSavedCandidates";

type CandidateProfile = {
  id: string
  full_name: string | null
  email: string | null
  cv_filename: string | null
  created_at: string
}

export default function RecruiterCandidateProfile() {
  const { id } = useParams<{ id: string }>();
  const { user, isPro } = useAuth();
  const { isSaved, toggleSave } = useSavedCandidates();
  const [copied, setCopied] = useState(false);
  const [cvLoading, setCvLoading] = useState(false);

  const { data: candidate, isLoading, isError } = useQuery<CandidateProfile>({
    queryKey: ["recruiter-candidate", id],
    enabled: !!id && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, cv_filename, created_at")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as CandidateProfile;
    },
  });

  // Record CV view
  const recordView = useMutation({
    mutationFn: async () => {
      if (!user || !id) return;
      await supabase.from("recruiter_cv_views").insert({ recruiter_id: user.id, candidate_id: id });
    },
  });

  const handleDownloadCV = async () => {
    if (!candidate?.cv_filename || !id) return;
    setCvLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from("cvs")
        .createSignedUrl(`${id}/cv.pdf`, 60);
      if (error || !data?.signedUrl) throw error ?? new Error("Failed to get CV URL");
      window.open(data.signedUrl, "_blank");
      recordView.mutate();
    } catch {
      alert("Could not load CV — please try again.");
    } finally {
      setCvLoading(false);
    }
  };

  const handleCopyEmail = async () => {
    if (!candidate?.email) return;
    await navigator.clipboard.writeText(candidate.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const initials = (c: CandidateProfile) =>
    (c.full_name ?? c.email ?? "?")[0].toUpperCase();

  const joinedDate = candidate
    ? new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date(candidate.created_at))
    : "";

  return (
    <div className="min-h-screen flex flex-col">
      <SEO title="Candidate Profile — IT ContractHub Recruiter" description="IT contractor candidate profile." noIndex={true} canonical={`/recruiter/candidates/${id}`} />
      <RecruiterNavbar />

      <main className="flex-1 container py-8 max-w-3xl">
        {/* Back */}
        <Link
          to="/recruiter/candidates"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Back to candidates
        </Link>

        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
          </div>
        )}

        {isError && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="font-semibold text-foreground">Candidate not found</p>
            <p className="text-sm text-muted-foreground mt-1">This profile may have been removed.</p>
          </div>
        )}

        {!isLoading && !isError && candidate && (
          <div className="space-y-6">
            {/* Profile header card */}
            <div className="rounded-xl border bg-card p-6">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold text-2xl shrink-0">
                  {initials(candidate)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h1 className="text-xl font-heading font-bold text-foreground">
                        {candidate.full_name ?? "IT Contractor"}
                      </h1>
                      <p className="text-sm text-muted-foreground mt-0.5">Joined {joinedDate}</p>
                    </div>
                    <button
                      onClick={() => id && toggleSave(id)}
                      className={`p-2 rounded-lg transition-colors shrink-0 ${
                        id && isSaved(id)
                          ? "text-violet-600 dark:text-violet-400 bg-violet-500/10"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                      title={id && isSaved(id) ? "Remove from saved" : "Save candidate"}
                    >
                      {id && isSaved(id) ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
                    </button>
                  </div>

                  {/* Status badges */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {candidate.cv_filename && (
                      <span className="inline-flex items-center gap-1 text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full font-medium">
                        <FileText className="h-3 w-3" /> CV Uploaded
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-full font-medium">
                      <User className="h-3 w-3" /> Active Contractor
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Subscription gate */}
            {!isPro && (
              <div className="rounded-xl border-2 border-violet-500/30 bg-violet-500/5 p-6 text-center">
                <p className="font-heading font-semibold text-foreground mb-1">Subscribe to view contact details & download CV</p>
                <p className="text-sm text-muted-foreground mb-4">Full access for £175/month.</p>
                <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700" asChild>
                  <Link to="/recruiter/upgrade">Subscribe — £175/month</Link>
                </Button>
              </div>
            )}

            {/* Contact & CV actions */}
            {isPro && (
              <div className="rounded-xl border bg-card p-5">
                <p className="font-heading font-semibold text-foreground mb-4">Contact & CV</p>

                <div className="space-y-3">
                  {/* Email */}
                  <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50 border">
                    <div className="flex items-center gap-2 min-w-0">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm text-foreground truncate">{candidate.email ?? "No email on file"}</span>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={handleCopyEmail}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted"
                        title="Copy email"
                      >
                        {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied ? "Copied" : "Copy"}
                      </button>
                      {candidate.email && (
                        <a
                          href={`mailto:${candidate.email}?subject=IT Contract Opportunity&body=Hi ${candidate.full_name?.split(' ')[0] ?? 'there'},%0A%0AI came across your profile on IT ContractHub and have a contract opportunity that might be a great fit for you.%0A%0APlease let me know if you're available for a quick call.%0A%0AKind regards`}
                          className="inline-flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 hover:underline font-medium px-2 py-1"
                        >
                          <Mail className="h-3.5 w-3.5" /> Email
                        </a>
                      )}
                    </div>
                  </div>

                  {/* CV download */}
                  {candidate.cv_filename ? (
                    <Button
                      variant="outline"
                      className="w-full gap-2 border-violet-500/30 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10"
                      onClick={handleDownloadCV}
                      disabled={cvLoading}
                    >
                      {cvLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      {cvLoading ? "Loading CV…" : "Download CV (PDF)"}
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border text-sm text-muted-foreground">
                      <FileText className="h-4 w-4 shrink-0" />
                      No CV uploaded yet
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Save shortlist CTA */}
            {id && !isSaved(id) && (
              <button
                onClick={() => toggleSave(id)}
                className="w-full rounded-xl border border-dashed border-violet-500/30 p-4 text-sm text-violet-600 dark:text-violet-400 hover:bg-violet-500/5 transition-colors flex items-center justify-center gap-2"
              >
                <Bookmark className="h-4 w-4" />
                Save to shortlist
              </button>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
