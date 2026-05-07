import { useQuery } from "@tanstack/react-query";
import { Search, Loader2, Lightbulb, CheckCircle2, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

function SuggestTermWidget() {
  const { user } = useAuth();
  const [term, setTerm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = term.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError(false);
    try {
      const { error: err } = await supabase.from("SuggestedSearchTerms").insert({
        SearchTerm: trimmed,
        UID: user?.id ?? null,
        AccountName: user?.user_metadata?.full_name ?? user?.email ?? null,
      });
      if (err) throw err;
      setSubmitted(true);
      setTerm("");
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Lightbulb className="h-4.5 w-4.5 text-primary" />
        </div>
        <div>
          <p className="font-heading font-semibold text-foreground">Suggest a search term</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Don't see your speciality? We'll add it to our monitoring list.
          </p>
        </div>
      </div>

      {submitted ? (
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 font-medium">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Thanks! We'll review your suggestion and add it soon.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            placeholder="e.g. Rust Developer, Quantum Computing..."
            value={term}
            onChange={e => { setTerm(e.target.value); setError(false); }}
            className="flex-1"
            disabled={submitting}
          />
          <Button type="submit" variant="hero" size="sm" disabled={submitting || !term.trim()} className="shrink-0">
            {submitting
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <><Send className="h-3.5 w-3.5 mr-1.5" />Suggest</>
            }
          </Button>
        </form>
      )}
      {error && <p className="text-xs text-destructive mt-2">Something went wrong — please try again.</p>}
    </div>
  );
}

export default function ContractSources() {
  const navigate = useNavigate();
  const { data: terms, isLoading, isError } = useQuery<string[]>({
    queryKey: ["contract-sources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("LinkedInScrapeList")
        .select("*");
      if (error) throw error;
      console.log('[ContractSources] raw row sample:', data?.[0]);
      // Find the SearchTerm column regardless of casing
      const firstRow = data?.[0] ?? {};
      const key = Object.keys(firstRow).find(k => k.toLowerCase() === 'searchterm') ?? 'SearchTerm';
      const unique = [...new Set((data ?? []).map((r: Record<string, string>) => r[key]).filter(Boolean))];
      return unique.sort((a, b) => a.localeCompare(b));
    },
    staleTime: 60 * 60 * 1000,
  });

  // Group terms alphabetically
  const grouped = (terms ?? []).reduce<Record<string, string[]>>((acc, term) => {
    const letter = term[0].toUpperCase();
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(term);
    return acc;
  }, {});

  const letters = Object.keys(grouped).sort();

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="What Contracts We Pull — IT ContractHub"
        description="A full list of the contract search terms and categories IT ContractHub monitors across hundreds of UK job sources."
        canonical="/contract-sources"
      />
      <Navbar />

      <section className="border-b bg-surface-subtle">
        <div className="container py-8 md:py-12 max-w-4xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-brand shrink-0">
              <Search className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">
              What Contracts We Pull
            </h1>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            IT ContractHub monitors hundreds of UK job sources for the search terms below — updated continuously so you never miss a relevant role.
          </p>
          {!isLoading && terms && (
            <p className="mt-2 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{terms.length}</span> search terms actively monitored
            </p>
          )}
        </div>
      </section>

      <section className="container py-10 flex-1 max-w-4xl">
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {isError && (
          <div className="text-center py-20">
            <p className="font-heading font-semibold text-foreground">Failed to load contract sources</p>
            <p className="text-sm text-muted-foreground mt-1">Please try again later.</p>
          </div>
        )}

        {!isLoading && !isError && letters.length > 0 && (
          <div className="space-y-8">
            {letters.map(letter => (
              <div key={letter}>
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 border-b pb-1">
                  {letter}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {grouped[letter].map(term => (
                    <button
                      key={term}
                      onClick={() => navigate(`/contracts?q=${encodeURIComponent(term)}`)}
                      className="inline-flex items-center rounded-full border bg-card px-3 py-1 text-sm text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors cursor-pointer"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Suggest a term */}
        <div className="mt-12">
          <SuggestTermWidget />
        </div>
      </section>

      <Footer />
    </div>
  );
}
