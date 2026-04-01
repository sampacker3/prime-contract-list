import { MapPin, Clock, ExternalLink, Bookmark, Loader2, Search, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { useSavedJobs } from "@/hooks/useSavedJobs";

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

export default function SavedJobsPage() {
  const { savedContracts, savedLoading, toggleSave, savedJobIds } = useSavedJobs();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Saved Contracts — ContractHub"
        description="Your saved IT contract roles on ContractHub."
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

                return (
                  <div
                    key={contract.id}
                    className="rounded-xl border bg-card transition-all hover:shadow-brand hover:border-primary/20"
                  >
                    <div className="p-5 cursor-pointer" onClick={() => toggleExpand(contract.id)}>
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
                        {contract.Description
                          ? <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{contract.Description}</p>
                          : <p className="text-sm text-muted-foreground italic">No description available.</p>
                        }
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
    </div>
  );
}
