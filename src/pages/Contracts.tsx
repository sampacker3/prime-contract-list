import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, MapPin, Clock, ChevronDown, Bookmark, Loader2, ChevronUp, ArrowRight, Lock, Sparkles, X } from "lucide-react";
import { useCVExists } from "@/hooks/useCVExists";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AuthModal from "@/components/AuthModal";
import { supabase } from "@/lib/supabase";
import type { Contract } from "@/types/database";
import SEO from "@/components/SEO";
import { useSavedJobs } from "@/hooks/useSavedJobs";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams, Link } from "react-router-dom";

const PAGE_SIZE = 25;

function useContracts(search: string, location: string, page: number, ir35: "all" | "outside" | "inside", date: "all" | "24h" | "week" | "month", cvSkills?: string[]) {
  return useQuery({
    queryKey: ["contracts", search, location, page, ir35, date, cvSkills],
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("LinkedinScrapeResults")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (cvSkills && cvSkills.length > 0) {
        const filters = cvSkills.slice(0, 10).flatMap(s => [
          `JobTitle.ilike.%${s}%`,
          `Description.ilike.%${s}%`,
        ]).join(",");
        query = query.or(filters);
      } else if (search) {
        query = query.or(
          `JobTitle.ilike.%${search}%,Description.ilike.%${search}%,Company.ilike.%${search}%`
        );
      }

      if (location) {
        query = query.ilike("Location", `%${location}%`);
      }

      if (ir35 === "outside") {
        query = query.eq("IR35Status", "Outside IR35");
      } else if (ir35 === "inside") {
        query = query.eq("IR35Status", "Inside IR35");
      }

      if (date !== "all") {
        const now = new Date();
        const cutoff = new Date(now);
        if (date === "24h") cutoff.setHours(now.getHours() - 24);
        else if (date === "week") cutoff.setDate(now.getDate() - 7);
        else if (date === "month") cutoff.setMonth(now.getMonth() - 1);
        query = query.gte("created_at", cutoff.toISOString());
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data as Contract[], total: count ?? 0 };
    },
    placeholderData: (prev) => prev,
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

function scoreCVRelevance(contract: Contract, skills: string[]): number {
  const haystack = `${contract.JobTitle ?? ""} ${contract.Description ?? ""}`.toLowerCase();
  return skills.filter(s => haystack.includes(s.toLowerCase())).length;
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
  const [locationInput, setLocationInput] = useState("United Kingdom");
  const [searchTerm, setSearchTerm] = useState(initialQ);
  const [locationFilter, setLocationFilter] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<"newest" | "relevance">("newest");
  const [ir35Filter, setIr35Filter] = useState<"all" | "outside" | "inside">("all");
  const [dateFilter, setDateFilter] = useState<"all" | "24h" | "week" | "month">("all");
  const [page, setPage] = useState(0);

  const { user, loading: authLoading, isPro, proLoading } = useAuth();
  const { cvExists } = useCVExists();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  // Show auth modal as soon as we know the user is not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      setShowAuthModal(true);
    } else if (user) {
      setShowAuthModal(false);
    }
  }, [authLoading, user]);
  const [cvSearchMode, setCvSearchMode] = useState(false);
  const [cvSkills, setCvSkills] = useState<string[]>([]);
  const [cvSkillsLoading, setCvSkillsLoading] = useState(false);
  const searchWrapperRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { savedJobIds, toggleSave } = useSavedJobs();
  const { data: result, isLoading, isError } = useContracts(searchTerm, locationFilter, page, ir35Filter, dateFilter, cvSearchMode ? cvSkills : undefined);
  const raw = result?.data ?? [];
  const totalCount = result?.total ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const contracts = cvSearchMode && cvSkills.length > 0
    ? [...raw].sort((a, b) => scoreCVRelevance(b, cvSkills) - scoreCVRelevance(a, cvSkills))
    : sortBy === "relevance" && searchTerm
      ? [...raw].sort((a, b) => scoreRelevance(b, searchTerm) - scoreRelevance(a, searchTerm))
      : raw;

  const activateCVSearch = async () => {
    if (!user) return;
    setSearchFocused(false);
    setCvSkillsLoading(true);
    const { data } = await supabase
      .from("UserCVScrapeDetails")
      .select("KeySkills")
      .eq("UID", user.id)
      .maybeSingle();
    const skills = (data?.KeySkills as string[]) ?? [];
    setCvSkills(skills);
    setCvSearchMode(true);
    setSearchTerm("");
    setSearchInput("");
    setPage(0);
    setCvSkillsLoading(false);
  };

  const clearCVSearch = () => {
    setCvSearchMode(false);
    setCvSkills([]);
    setSearchTerm("");
    setSearchInput("");
    setPage(0);
  };

  // Auto-activate CV search if navigated here with ?cv=1
  useEffect(() => {
    if (searchParams.get("cv") === "1" && user && !cvSearchMode) {
      activateCVSearch();
    }
  }, [user]);

  const handleBookmark = (e: React.MouseEvent, jobId: number) => {
    e.stopPropagation();
    if (!user) { setShowAuthModal(true); return; }
    if (!isPro) { navigate("/upgrade"); return; }
    toggleSave.mutate(jobId);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    (document.activeElement as HTMLElement)?.blur();
    setSearchTerm(searchInput);
    setLocationFilter(locationInput);
    setPage(0);
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
        <div className="container py-6 md:py-8">
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground mb-4 md:mb-6">Browse Contracts</h1>
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-2 md:gap-3">
            <div className="relative flex-1" ref={searchWrapperRef}>
              {cvSearchMode ? (
                /* CV search mode — show pill instead of text input */
                <div className="flex items-center h-10 rounded-md border border-input bg-background px-3 gap-2">
                  <div
                    className="h-5 w-5 rounded flex items-center justify-center shrink-0"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6, #06b6d4)" }}
                  >
                    {cvSkillsLoading
                      ? <Loader2 className="h-3 w-3 text-white animate-spin" />
                      : <Sparkles className="h-3 w-3 text-white" />
                    }
                  </div>
                  <span className="text-sm font-medium text-foreground flex-1">Searching with CV</span>
                  <button
                    type="button"
                    onClick={clearCVSearch}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Clear CV search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <Input
                    placeholder="Search by title, skill or technology..."
                    className="pl-10 pr-8"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                  />
                  {searchInput && (
                    <button
                      type="button"
                      onClick={() => { setSearchInput(""); setSearchTerm(""); setPage(0); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-10"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  {/* AI CV suggestion — only shown when user is logged in and has a CV */}
                  {searchFocused && user && cvExists && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-border bg-card shadow-lg overflow-hidden">
                      <button
                        type="button"
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={activateCVSearch}
                      >
                        <div
                          className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6, #06b6d4)" }}
                        >
                          <Sparkles className="h-3.5 w-3.5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Search for contracts based on my CV</p>
                          <p className="text-xs text-muted-foreground">Matches roles to your skills and experience</p>
                        </div>
                      </button>
                    </div>
                  )}
                </>
              )}
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

          {/* Filters */}
          <div className="flex flex-col gap-2 mt-4">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-medium text-muted-foreground shrink-0">Posted:</span>
              <div className="flex-1 overflow-x-auto scrollbar-none">
                <div className="flex rounded-lg border text-xs font-medium bg-background w-max">
                  {(
                    [
                      { value: "all",   label: "Any time" },
                      { value: "24h",   label: "Last 24h" },
                      { value: "week",  label: "Last 7 days" },
                      { value: "month", label: "Last month" },
                    ] as const
                  ).map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => { setDateFilter(value); setPage(0); }}
                      className={`px-3 py-1.5 whitespace-nowrap transition-colors border-r last:border-r-0 ${
                        dateFilter === value
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-medium text-muted-foreground shrink-0">IR35:</span>
              <div className="flex-1 overflow-x-auto scrollbar-none">
                <div className="flex rounded-lg border text-xs font-medium bg-background w-max">
                  {(
                    [
                      { value: "all",     label: "All" },
                      { value: "outside", label: "Outside IR35" },
                      { value: "inside",  label: "Inside IR35" },
                    ] as const
                  ).map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => { setIr35Filter(value); setPage(0); }}
                      className={`px-3 py-1.5 whitespace-nowrap transition-colors border-r last:border-r-0 ${
                        ir35Filter === value
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Auth modal — shown to non-logged-in users; closing navigates home */}
      {showAuthModal && (
        <AuthModal onClose={() => { setShowAuthModal(false); navigate("/"); }} />
      )}

      {/* Upgrade banner — only render once plan status is confirmed */}
      {user && !proLoading && !isPro && (
        <div className="bg-primary/5 border-b border-primary/20">
          <div className="container py-3 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              <Lock className="h-4 w-4 text-primary shrink-0" />
              <span className="text-foreground font-medium">You're on the free plan.</span>
              <span className="text-muted-foreground hidden sm:inline">Upgrade to Pro to see full details, company info, and apply directly.</span>
            </div>
            <Button variant="hero" size="sm" asChild>
              <Link to="/upgrade">Upgrade to Pro</Link>
            </Button>
          </div>
        </div>
      )}

      {/* Results */}
      <section className="container py-8 flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
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
                {cvSearchMode && (
                  <span className="ml-1 text-primary font-medium flex items-center gap-1 inline-flex">
                    <Sparkles className="h-3 w-3" /> matched to your CV
                  </span>
                )}
                {!cvSearchMode && (searchTerm || locationFilter) && (
                  <span className="ml-1 text-primary font-medium">matching your search</span>
                )}
              </>
            )}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground shrink-0">Sort by:</span>
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
                    className="p-4 md:p-5 cursor-pointer"
                    onClick={() => toggleExpand(contract.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Title + badges */}
                        <div className="flex items-start gap-2 mb-1 flex-wrap">
                          <h3 className="font-heading font-semibold text-foreground text-sm md:text-base leading-snug">
                            {contract.JobTitle ?? "Untitled Role"}
                          </h3>
                          {postedToday && (
                            <Badge className="text-xs shrink-0 bg-green-500 hover:bg-green-500 text-white border-0 mt-0.5">
                              New
                            </Badge>
                          )}
                        </div>

                        {/* Company */}
                        {isPro ? (
                          <p className="text-sm text-muted-foreground truncate">{contract.Company ?? "Company not listed"}</p>
                        ) : (
                          <p className="text-sm text-muted-foreground blur-sm select-none opacity-50 w-32">██████████ Ltd</p>
                        )}

                        {/* Meta row */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                          {isPro ? (
                            <>
                              {contract.Location && (
                                <span className="flex items-center gap-1 truncate max-w-[180px]"><MapPin className="h-3 w-3 shrink-0" />{contract.Location}</span>
                              )}
                              {contract.EmploymentType && (
                                <span className="flex items-center gap-1"><Clock className="h-3 w-3 shrink-0" />{contract.EmploymentType}</span>
                              )}
                              {contract.IR35Status && (
                                <span>{contract.IR35Status}</span>
                              )}
                              {isPro && contract.PayRate && (
                                <span className="inline-flex items-center rounded-full bg-green-500/10 border border-green-500/20 px-2 py-0.5 text-xs font-semibold text-green-600 dark:text-green-400">
                                  {contract.PayRate}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="flex items-center gap-1 blur-sm select-none opacity-50">
                              <MapPin className="h-3 w-3" />London, UK · Contract
                            </span>
                          )}
                          <span className="text-muted-foreground/60">{formatPostedDate(contract.created_at)}</span>
                        </div>
                      </div>

                      {/* Actions — always top-right */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-8 w-8 ${savedJobIds.has(contract.id) ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
                          onClick={(e) => handleBookmark(e, contract.id)}
                        >
                          <Bookmark className={`h-4 w-4 ${savedJobIds.has(contract.id) ? "fill-current" : ""}`} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded description */}
                  {expanded && (
                    <div className="px-5 pb-5 border-t pt-4">
                      {isPro ? (
                        <>
                          {contract.Description ? (
                            <p className="text-sm text-foreground whitespace-pre-line leading-relaxed line-clamp-4 mb-4">
                              {contract.Description}
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground italic mb-4">No description available.</p>
                          )}
                          <Button
                            variant="hero"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); navigate(`/contract/${contract.id}`); }}
                          >
                            See More <ArrowRight className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : (
                        <div className="flex items-center justify-between gap-4 py-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Lock className="h-4 w-4 text-primary shrink-0" />
                            <span>Upgrade to Pro to view full descriptions and apply directly.</span>
                          </div>
                          <Button variant="hero" size="sm" asChild onClick={(e) => e.stopPropagation()}>
                            <Link to="/upgrade">Upgrade</Link>
                          </Button>
                        </div>
                      )}
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

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            <button
              onClick={() => { setPage(p => Math.max(0, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              disabled={page === 0}
              className="px-3 py-1.5 rounded-lg border text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent transition-colors"
            >
              ← Prev
            </button>

            {Array.from({ length: totalPages }, (_, i) => i)
              .filter(i => i === 0 || i === totalPages - 1 || Math.abs(i - page) <= 2)
              .reduce<(number | "…")[]>((acc, i, idx, arr) => {
                if (idx > 0 && (i as number) - (arr[idx - 1] as number) > 1) acc.push("…");
                acc.push(i);
                return acc;
              }, [])
              .map((item, idx) =>
                item === "…" ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground text-sm">…</span>
                ) : (
                  <button
                    key={item}
                    onClick={() => { setPage(item as number); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className={`min-w-[36px] px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                      page === item ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"
                    }`}
                  >
                    {(item as number) + 1}
                  </button>
                )
              )}

            <button
              onClick={() => { setPage(p => Math.min(totalPages - 1, p + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 rounded-lg border text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent transition-colors"
            >
              Next →
            </button>
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
};

export default ContractsPage;
