import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Users, Bookmark, Briefcase, PlusCircle, ArrowRight,
  TrendingUp, Search, Loader2, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import RecruiterNavbar from "@/components/RecruiterNavbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

type DashboardStats = {
  totalCandidates: number
  savedCandidates: number
  postedContracts: number
}

export default function RecruiterDashboard() {
  const { user, isPro, isRecruiter } = useAuth();

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["recruiter-dashboard-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [candidatesRes, savedRes, contractsRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).not("cv_filename", "is", null),
        supabase.from("recruiter_saved_candidates").select("id", { count: "exact", head: true }).eq("recruiter_id", user!.id),
        supabase.from("recruiter_contracts").select("id", { count: "exact", head: true }).eq("recruiter_id", user!.id),
      ]);
      return {
        totalCandidates: candidatesRes.count ?? 0,
        savedCandidates: savedRes.count ?? 0,
        postedContracts: contractsRes.count ?? 0,
      };
    },
  });

  const { data: recentSaved } = useQuery({
    queryKey: ["recruiter-recent-saved", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recruiter_saved_candidates")
        .select("candidate_id, created_at, profiles:candidate_id(id, full_name, email, cv_filename)")
        .eq("recruiter_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: recentContracts } = useQuery({
    queryKey: ["recruiter-recent-contracts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recruiter_contracts")
        .select("*")
        .eq("recruiter_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  const statCards = [
    {
      label: "IT Contractors with CV",
      value: isLoading ? "—" : (stats?.totalCandidates ?? 0).toLocaleString(),
      icon: Users,
      href: "/recruiter/candidates",
      color: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    },
    {
      label: "Saved Candidates",
      value: isLoading ? "—" : (stats?.savedCandidates ?? 0).toLocaleString(),
      icon: Bookmark,
      href: "/recruiter/saved",
      color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    },
    {
      label: "Contracts Posted",
      value: isLoading ? "—" : (stats?.postedContracts ?? 0).toLocaleString(),
      icon: Briefcase,
      href: "/recruiter/contracts",
      color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <SEO title="Recruiter Dashboard — IT ContractHub" description="Your IT ContractHub recruiter dashboard." noIndex={true} canonical="/recruiter/dashboard" />
      <RecruiterNavbar />

      <main className="flex-1 container py-8 max-w-5xl space-y-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">Recruiter Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Search candidates, post contracts, fill roles faster.</p>
          </div>
          <Button
            className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700 w-full sm:w-auto"
            asChild
          >
            <Link to="/recruiter/post-contract">
              <PlusCircle className="h-4 w-4 mr-1.5" /> Post a Contract
            </Link>
          </Button>
        </div>

        {/* Subscription gate */}
        {!isPro && isRecruiter && (
          <div className="rounded-xl border-2 border-violet-500/30 bg-violet-500/5 p-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 shrink-0">
              <TrendingUp className="h-6 w-6 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="flex-1">
              <p className="font-heading font-semibold text-foreground">Subscribe to unlock full access</p>
              <p className="text-sm text-muted-foreground mt-0.5">Search candidate CVs, view contact details, and post contracts for £175/month.</p>
            </div>
            <Button
              className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700 shrink-0 w-full sm:w-auto"
              asChild
            >
              <Link to="/recruiter/upgrade">Subscribe — £175/month</Link>
            </Button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {statCards.map(({ label, value, icon: Icon, href, color }) => (
            <Link
              key={label}
              to={href}
              className="rounded-xl border bg-card p-5 hover:bg-accent/50 transition-colors group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
              <div className="text-2xl font-heading font-bold text-foreground">{value}</div>
              <div className="text-sm text-muted-foreground mt-0.5">{label}</div>
            </Link>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            to="/recruiter/candidates"
            className="rounded-xl border bg-card p-5 hover:bg-accent/50 transition-colors flex items-center gap-4 group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
              <Search className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">Search Candidates</p>
              <p className="text-xs text-muted-foreground">Browse IT contractor CVs</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </Link>
          <Link
            to="/recruiter/post-contract"
            className="rounded-xl border bg-card p-5 hover:bg-accent/50 transition-colors flex items-center gap-4 group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <PlusCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">Post a Contract</p>
              <p className="text-xs text-muted-foreground">Reach thousands of active contractors</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </Link>
        </div>

        {/* Recent saved candidates */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <p className="font-heading font-semibold text-foreground">Recently Saved Candidates</p>
            <Link to="/recruiter/saved" className="text-xs text-violet-600 dark:text-violet-400 hover:underline font-medium">
              View all →
            </Link>
          </div>
          {!recentSaved || recentSaved.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <Bookmark className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No saved candidates yet</p>
              <Link to="/recruiter/candidates" className="text-xs text-violet-600 dark:text-violet-400 hover:underline font-medium mt-1 inline-block">
                Browse candidates →
              </Link>
            </div>
          ) : (
            <div className="divide-y">
              {recentSaved.map((row: any) => {
                const candidate = row.profiles as { id: string; full_name: string | null; email: string | null; cv_filename: string | null } | null;
                if (!candidate) return null;
                return (
                  <Link
                    key={row.candidate_id}
                    to={`/recruiter/candidates/${row.candidate_id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-accent/50 transition-colors group"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 font-semibold text-sm shrink-0">
                      {(candidate.full_name ?? candidate.email ?? '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{candidate.full_name ?? 'Unnamed candidate'}</p>
                      <p className="text-xs text-muted-foreground truncate">{candidate.email}</p>
                    </div>
                    {candidate.cv_filename && (
                      <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full shrink-0">CV</span>
                    )}
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground shrink-0" />
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent posted contracts */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <p className="font-heading font-semibold text-foreground">Your Posted Contracts</p>
            <Link to="/recruiter/contracts" className="text-xs text-violet-600 dark:text-violet-400 hover:underline font-medium">
              View all →
            </Link>
          </div>
          {!recentContracts || recentContracts.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <Briefcase className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No contracts posted yet</p>
              <Link to="/recruiter/post-contract" className="text-xs text-violet-600 dark:text-violet-400 hover:underline font-medium mt-1 inline-block">
                Post your first contract →
              </Link>
            </div>
          ) : (
            <div className="divide-y">
              {recentContracts.map((contract: any) => (
                <div key={contract.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{contract.title}</p>
                    <p className="text-xs text-muted-foreground">{contract.company ?? 'No company'} · {contract.location ?? 'Remote'}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                    contract.status === 'active'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {contract.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
