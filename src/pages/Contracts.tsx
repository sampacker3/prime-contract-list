import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, MapPin, Clock, Filter, ChevronDown, ExternalLink, Bookmark, Loader2, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import type { Contract } from "@/types/database";
import SEO from "@/components/SEO";
import { useSavedJobs } from "@/hooks/useSavedJobs";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";

function useContracts(search: string, location: string) {
  return useQuery({
    queryKey: ["contracts", search, location],
    queryFn: async () => {
      let query = supabase
        .from("LinkedinScrapeResults")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(50);

      if (search) {
        query = query.or(
          `JobTitle.ilike.%${search}%,Description.ilike.%${search}%,Company.ilike.%${search}%`
        );
      }

      if (location) {
        query = query.ilike("Location", `%${location}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data as Contract[], total: count ?? 0 };
    },
  });
}

function scoreRelevance(contract: Contract, term: string): number {
  if (!term) return 0;
  const t = term.toLowerCase();
  const title = (contract.JobTitle ?? "").toLowerCase();
  const company = (contract.Company ?? "").toLowerCase();
  const desc = (contract.Description ?? "").toLowerCase();
  if (title === t) return 3;
  if (title.startsWith(t)) return 2.5;
  if (title.includes(t)) return 2;
  if (company.includes(t)) return 1.5;
  if (desc.includes(t)) return 1;
  return 0;
}

// PostedDate is a date-only field (no time). Use created_at for the full timestamp.
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

const ContractsPage = () => {
  const [searchParams] = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const [searchInput, setSearchInput] = useState(initialQ);
  const [locationInput, setLocationInput] = useState("");
  const [searchTerm, setSearchTerm] = useState(initialQ);
  const [locationFilter, setLocationFilter] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<"newest" | "relevance">("newest");

  const { user } = useAuth();
  const navigate = useNavigate();
  const { savedJobIds, toggleSave } = useSavedJobs();
  const { data: result, isLoading, isError } = useContracts(searchTerm, locationFilter);
  const raw = result?.data ?? [];
  const totalCount = result?.total ?? 0;

  const contracts = sortBy === "relevance" && searchTerm
    ? [...raw].sort((a, b) => scoreRelevance(b, searchTerm) - scoreRelevance(a, searchTerm))
    : raw;

  const handleBookmark = (e: React.MouseEvent, jobId: number) => {
    e.stopPropagation();
    if (!user) { navigate("/login"); return; }
    toggleSave.mutate(jobId);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(searchInput);
    setLocationFilter(locationInput);
  };

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Browse IT Contracts — Find Your Next UK Contract Role"
        description="Search thousands of IT contract roles across the UK. Filter by job title, location, technology stack, and more. Updated in real-time from hundreds of sources."
        canonical="/contracts"
      />
      <Navbar />

      {/* Search header */}
      <section className="border-b bg-surface-subtle">
        <div className="container py-8">
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground mb-6">Browse Contracts</h1>
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, skill or technology..."
                className="pl-10"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <div className="relative md:w-64">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Location..."
                className="pl-10"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
              />
            </div>
            <Button type="submit" variant="hero">
              <Search className="h-4 w-4 mr-1" /> Search
            </Button>
          </form>
        </div>
      </section>

      {/* Results */}
      <section className="container py-8 flex-1">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-muted-foreground">
            {isLoading ? (
              "Loading contracts..."
            ) : (
              <>
                Showing <span className="font-semibold text-foreground">{contracts.length}</span>
                {totalCount > contracts.length && (
                  <> of <span className="font-semibold text-foreground">{totalCount.toLocaleString("en-GB")}</span></>
                )}
                {" "}contract{totalCount !== 1 ? "s" : ""}
                {(searchTerm || locationFilter) && (
                  <span className="ml-1 text-primary font-medium">matching your search</span>
                )}
              </>
            )}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Sort by:</span>
            <div className="flex rounded-lg border overflow-hidden text-xs font-medium">
              <button
                className={`px-3 py-1.5 transition-colors ${sortBy === "newest" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-accent"}`}
                onClick={() => setSortBy("newest")}
              >
                Newest
              </button>
              <button
                className={`px-3 py-1.5 transition-colors ${sortBy === "relevance" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-accent"}`}
                onClick={() => setSortBy("relevance")}
              >
                Relevance
              </button>
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {isError && (
          <div className="text-center py-20">
            <p className="text-lg font-heading font-semibold text-foreground">Failed to load contracts</p>
            <p className="text-sm text-muted-foreground mt-1">Please try again later</p>
          </div>
        )}

        {!isLoading && !isError && (
          <div className="space-y-3">
            {contracts.map((contract) => {
              const postedToday = isToday(contract.created_at);
              const expanded = expandedId === contract.id;

              return (
                <div
                  key={contract.id}
                  className="rounded-xl border bg-card transition-all hover:shadow-brand hover:border-primary/20"
                >
                  {/* Card header — always visible, click to expand */}
                  <div
                    className="p-5 cursor-pointer"
                    onClick={() => toggleExpand(contract.id)}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-heading font-semibold text-foreground truncate">
                            {contract.JobTitle ?? "Untitled Role"}
                          </h3>
                          {postedToday && (
                            <Badge className="text-xs shrink-0 bg-green-500 hover:bg-green-500 text-white border-0">
                              Posted Today
                            </Badge>
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
                        <span className="text-xs text-muted-foreground">
                          {formatPostedDate(contract.created_at)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={savedJobIds.has(contract.id) ? "text-primary" : "text-muted-foreground hover:text-primary"}
                          onClick={(e) => handleBookmark(e, contract.id)}
                        >
                          <Bookmark className={`h-4 w-4 ${savedJobIds.has(contract.id) ? "fill-current" : ""}`} />
                        </Button>
                        {contract.URL && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(contract.URL!, "_blank");
                            }}
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

                  {/* Expanded description */}
                  {expanded && contract.Description && (
                    <div className="px-5 pb-5 border-t pt-4">
                      <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
                        {contract.Description}
                      </p>
                    </div>
                  )}
                  {expanded && !contract.Description && (
                    <div className="px-5 pb-5 border-t pt-4">
                      <p className="text-sm text-muted-foreground italic">No description available.</p>
                    </div>
                  )}
                </div>
              );
            })}

            {contracts.length === 0 && (
              <div className="text-center py-20">
                <Search className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                <p className="text-lg font-heading font-semibold text-foreground">No contracts found</p>
                <p className="text-sm text-muted-foreground mt-1">Try adjusting your search terms</p>
              </div>
            )}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
};

export default ContractsPage;
