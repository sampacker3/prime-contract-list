import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import type { Contract } from "@/types/database";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AuthModal from "@/components/AuthModal";

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

function usePreviewContracts(search: string) {
  return useQuery({
    queryKey: ["preview-contracts", search],
    queryFn: async () => {
      let query = supabase
        .from("LinkedinScrapeResults")
        .select("*")
        .order("PostedDate", { ascending: false })
        .limit(20);
      if (search) {
        query = query.or(
          `JobTitle.ilike.%${search}%,Description.ilike.%${search}%,Company.ilike.%${search}%`
        );
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Contract[];
    },
  });
}

export default function SearchPreview() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQ = searchParams.get("q") ?? "";
  const [searchInput, setSearchInput] = useState(initialQ);
  const [searchTerm, setSearchTerm] = useState(initialQ);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const { data: contracts = [], isLoading } = usePreviewContracts(searchTerm);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchInput.trim();
    navigate(q ? `/search-preview?q=${encodeURIComponent(q)}` : "/search-preview", { replace: true });
    setSearchTerm(q);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Search bar */}
      <section className="border-b bg-surface-subtle">
        <div className="container py-8">
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground mb-2">
            {searchTerm ? `Results for "${searchTerm}"` : "Browse Contracts"}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">Sign up to unlock full details, rates, and apply early.</p>
          <form onSubmit={handleSearch} className="flex gap-3 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, skill or technology..."
                className="pl-10"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <Button type="submit" variant="hero">Search</Button>
          </form>
        </div>
      </section>

      {/* Sign-up banner */}
      <div className="bg-primary/5 border-b border-primary/20">
        <div className="container py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Lock className="h-4 w-4 text-primary shrink-0" />
            <span>You're viewing a <strong>preview</strong> — sign up free to unlock full contract details, rates & apply early</span>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button size="sm" variant="hero" onClick={() => setShowAuthModal(true)}>
              Sign Up Free <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowAuthModal(true)}>
              Log In
            </Button>
          </div>
        </div>
      </div>

      {/* Results */}
      <main className="flex-1 container py-8">
        {isLoading ? (
          <div className="flex justify-center py-20 text-muted-foreground text-sm">Loading contracts...</div>
        ) : contracts.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">No contracts found for "{searchTerm}"</div>
        ) : (
          <div className="space-y-3">
            {contracts.map((c) => (
              <PreviewCard key={c.id} contract={c} onSignUp={() => setShowAuthModal(true)} />
            ))}
          </div>
        )}
      </main>

      {/* Bottom CTA */}
      <section className="border-t bg-surface-subtle">
        <div className="container py-12 text-center">
          <Lock className="h-8 w-8 text-primary mx-auto mb-3" />
          <h2 className="text-2xl font-heading font-bold text-foreground mb-2">Unlock all contract details</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Create a free account to view rates, full descriptions, company details, and apply before anyone else.
          </p>
          <Button variant="hero" size="lg" onClick={() => setShowAuthModal(true)}>
            Sign Up Free — It's Quick <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </section>

      <Footer />
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </div>
  );
}

function PreviewCard({ contract, onSignUp }: { contract: Contract; onSignUp: () => void }) {
  return (
    <div
      className="relative rounded-xl border bg-card p-5 cursor-pointer hover:border-primary/40 transition-colors group"
      onClick={onSignUp}
    >
      {/* Visible: title + date */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <h3 className="font-heading font-semibold text-foreground text-base leading-snug">
          {contract.JobTitle}
        </h3>
        <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
          {contract.created_at ? formatPostedDate(contract.created_at) : contract.PostedDate}
        </span>
      </div>

      {/* Blurred: company, location, rate */}
      <div className="flex flex-wrap gap-3 mb-3 blur-sm select-none pointer-events-none">
        <span className="text-sm text-muted-foreground">████████ Ltd</span>
        <span className="text-sm text-muted-foreground">·</span>
        <span className="text-sm text-muted-foreground">████████, UK</span>
        <span className="text-sm font-medium text-primary">£███/day</span>
      </div>

      {/* Blurred: description */}
      <div className="blur-sm select-none pointer-events-none space-y-1">
        <div className="h-3 bg-muted-foreground/20 rounded w-full" />
        <div className="h-3 bg-muted-foreground/20 rounded w-5/6" />
        <div className="h-3 bg-muted-foreground/20 rounded w-4/6" />
      </div>

      {/* Lock overlay on hover */}
      <div className="absolute inset-0 rounded-xl flex items-center justify-end pr-5 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg">
          <Lock className="h-3 w-3" /> Sign up to view
        </div>
      </div>
    </div>
  );
}
