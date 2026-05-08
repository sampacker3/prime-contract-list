import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Bookmark, BookmarkCheck, ArrowRight, Mail,
  FileText, Loader2, Users,
} from "lucide-react";
import RecruiterNavbar from "@/components/RecruiterNavbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useSavedCandidates } from "@/hooks/useSavedCandidates";

type SavedRow = {
  candidate_id: string
  created_at: string
  profiles: {
    id: string
    full_name: string | null
    email: string | null
    cv_filename: string | null
  } | null
}

export default function RecruiterSavedCandidates() {
  const { user, isPro } = useAuth();
  const { toggleSave } = useSavedCandidates();

  const { data: saved, isLoading, isError } = useQuery<SavedRow[]>({
    queryKey: ["recruiter-saved-candidates-full", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recruiter_saved_candidates")
        .select("candidate_id, created_at, profiles:candidate_id(id, full_name, email, cv_filename)")
        .eq("recruiter_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SavedRow[];
    },
  });

  const initials = (c: { full_name: string | null; email: string | null }) =>
    (c.full_name ?? c.email ?? "?")[0].toUpperCase();

  return (
    <div className="min-h-screen flex flex-col">
      <SEO title="Saved Candidates — IT ContractHub Recruiter" description="Your shortlisted IT contractor candidates." noIndex={true} canonical="/recruiter/saved" />
      <RecruiterNavbar />

      <section className="border-b bg-surface-subtle">
        <div className="container py-8 max-w-5xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 shrink-0">
              <Bookmark className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-heading font-bold text-foreground">Saved Candidates</h1>
              <p className="text-sm text-muted-foreground">
                {isLoading ? "Loading…" : `${(saved ?? []).length} shortlisted`}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-8 flex-1 max-w-5xl">
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
          </div>
        )}

        {isError && (
          <div className="text-center py-20">
            <p className="font-heading font-semibold text-foreground">Failed to load saved candidates</p>
          </div>
        )}

        {!isLoading && !isError && (saved ?? []).length === 0 && (
          <div className="text-center py-20">
            <Bookmark className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-heading font-semibold text-foreground">No saved candidates yet</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Save candidates from the search page to build your shortlist.</p>
            <Link
              to="/recruiter/candidates"
              className="inline-flex items-center gap-1.5 text-sm text-violet-600 dark:text-violet-400 hover:underline font-medium"
            >
              <Users className="h-4 w-4" /> Browse candidates →
            </Link>
          </div>
        )}

        {!isLoading && !isError && (saved ?? []).length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(saved ?? []).map((row) => {
              const candidate = row.profiles;
              if (!candidate) return null;
              return (
                <div key={row.candidate_id} className="rounded-xl border bg-card p-4 flex flex-col gap-3 hover:border-violet-500/40 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold text-sm shrink-0">
                      {initials(candidate)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">
                        {candidate.full_name ?? "IT Contractor"}
                      </p>
                      {isPro ? (
                        <p className="text-xs text-muted-foreground truncate">{candidate.email}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Email hidden</p>
                      )}
                    </div>
                    <button
                      onClick={() => toggleSave(row.candidate_id)}
                      className="p-1.5 rounded-md text-violet-600 dark:text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 transition-colors shrink-0"
                      title="Remove from saved"
                    >
                      <BookmarkCheck className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {candidate.cv_filename && (
                      <span className="inline-flex items-center gap-1 text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                        <FileText className="h-3 w-3" /> CV Available
                      </span>
                    )}
                    {isPro && candidate.email && (
                      <a
                        href={`mailto:${candidate.email}?subject=IT Contract Opportunity`}
                        className="inline-flex items-center gap-1 text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full hover:bg-blue-500/20 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Mail className="h-3 w-3" /> Email
                      </a>
                    )}
                  </div>

                  <Link
                    to={`/recruiter/candidates/${row.candidate_id}`}
                    className="mt-auto flex items-center justify-between text-xs font-medium text-violet-600 dark:text-violet-400 hover:underline"
                  >
                    View profile & CV <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}
