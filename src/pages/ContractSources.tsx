import { useQuery } from "@tanstack/react-query";
import { Search, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { supabase } from "@/lib/supabase";

export default function ContractSources() {
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
                    <span
                      key={term}
                      className="inline-flex items-center rounded-full border bg-card px-3 py-1 text-sm text-foreground hover:bg-accent transition-colors"
                    >
                      {term}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}
