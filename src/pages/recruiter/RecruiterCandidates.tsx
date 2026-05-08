import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Search, Loader2, Users, Bookmark, BookmarkCheck,
  ArrowRight, FileText, Mail,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import RecruiterNavbar from "@/components/RecruiterNavbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useSavedCandidates } from "@/hooks/useSavedCandidates";

type Candidate = {
  id: string
  full_name: string | null
  email: string | null
  cv_filename: string | null
  created_at: string
}

export default function RecruiterCandidates() {
  const { user, isPro } = useAuth();
  const [search, setSearch] = useState("");
  const { isSaved, toggleSave } = useSavedCandidates();

  const { data: candidates, isLoading, isError } = useQuery<Candidate[]>({
    queryKey: ["recruiter-candidates"],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, cv_filename, created_at")
        .not("cv_filename", "is", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Candidate[];
    },
  });

  const filtered = (candidates ?? []).filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (c.full_name ?? "").toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q)
    );
  });

  const initials = (c: Candidate) =>
    (c.full_name ?? c.email ?? "?")[0].toUpperCase();

  return (
    <div className="min-h-screen flex flex-col">
      <SEO title="Search Candidates — IT ContractHub Recruiter" description="Browse IT contractor CVs." noIndex={true} canonical="/recruiter/candidates" />
      <RecruiterNavbar />

      <section className="border-b bg-surface-subtle">
        <div className="container py-8 max-w-5xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 shrink-0">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-heading font-bold text-foreground">IT Contractor Candidates</h1>
              <p className="text-sm text-muted-foreground">
                {isLoading ? "Loading…" : `${(candidates ?? []).length.toLocaleString()} candidates with CVs`}
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-lg mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="container py-8 flex-1 max-w-5xl">
        {/* Subscription gate */}
        {!isPro && (
          <div className="rounded-xl border-2 border-violet-500/30 bg-violet-500/5 p-6 text-center mb-8">
            <p className="font-heading font-semibold text-foreground mb-1">Subscribe to view candidates</p>
            <p className="text-sm text-muted-foreground mb-4">Access all IT contractor CVs and contact details for £175/month.</p>
            <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700" asChild>
              <Link to="/recruiter/upgrade">Subscribe — £175/month</Link>
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
          </div>
        )}

        {isError && (
          <div className="text-center py-20">
            <p className="font-heading font-semibold text-foreground">Failed to load candidates</p>
            <p className="text-sm text-muted-foreground mt-1">Please try again later.</p>
          </div>
        )}

        {!isLoading && !isError && filtered.length === 0 && (
          <div className="text-center py-20">
            <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-heading font-semibold text-foreground">No candidates found</p>
            <p className="text-sm text-muted-foreground mt-1">Try a different search term.</p>
          </div>
        )}

        {!isLoading && !isError && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((candidate) => (
              <div key={candidate.id} className="rounded-xl border bg-card p-4 flex flex-col gap-3 hover:border-violet-500/40 transition-colors">
                {/* Header */}
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
                      <p className="text-xs text-muted-foreground">Email hidden — subscribe to view</p>
                    )}
                  </div>
                  <button
                    onClick={() => toggleSave(candidate.id)}
                    className={`p-1.5 rounded-md transition-colors shrink-0 ${
                      isSaved(candidate.id)
                        ? "text-violet-600 dark:text-violet-400 bg-violet-500/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    title={isSaved(candidate.id) ? "Unsave" : "Save candidate"}
                  >
                    {isSaved(candidate.id) ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                  </button>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {candidate.cv_filename && (
                    <span className="inline-flex items-center gap-1 text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                      <FileText className="h-3 w-3" /> CV Available
                    </span>
                  )}
                  {isPro && candidate.email && (
                    <a
                      href={`mailto:${candidate.email}`}
                      className="inline-flex items-center gap-1 text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full hover:bg-blue-500/20 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Mail className="h-3 w-3" /> Email
                    </a>
                  )}
                </div>

                {/* CTA */}
                <Link
                  to={`/recruiter/candidates/${candidate.id}`}
                  className="mt-auto flex items-center justify-between text-xs font-medium text-violet-600 dark:text-violet-400 hover:underline"
                >
                  View profile & CV <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}
