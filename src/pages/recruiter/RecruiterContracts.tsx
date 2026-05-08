import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Briefcase, PlusCircle, Loader2, MapPin, Banknote,
  CheckCircle2, XCircle, Trash2, ToggleLeft, ToggleRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import RecruiterNavbar from "@/components/RecruiterNavbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { RecruiterContract } from "@/types/database";

export default function RecruiterContracts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: contracts, isLoading, isError } = useQuery<RecruiterContract[]>({
    queryKey: ["recruiter-contracts-list", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recruiter_contracts")
        .select("*")
        .eq("recruiter_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RecruiterContract[];
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: "active" | "closed" }) => {
      const newStatus = status === "active" ? "closed" : "active";
      const { error } = await supabase
        .from("recruiter_contracts")
        .update({ status: newStatus })
        .eq("id", id)
        .eq("recruiter_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["recruiter-contracts-list", user?.id] }),
  });

  const deleteContract = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from("recruiter_contracts")
        .delete()
        .eq("id", id)
        .eq("recruiter_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruiter-contracts-list", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["recruiter-dashboard-stats", user?.id] });
    },
  });

  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const formatDate = (d: string) =>
    new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(d));

  return (
    <div className="min-h-screen flex flex-col">
      <SEO title="My Contracts — IT ContractHub Recruiter" description="Manage your posted contracts." noIndex={true} canonical="/recruiter/contracts" />
      <RecruiterNavbar />

      <section className="border-b bg-surface-subtle">
        <div className="container py-8 max-w-5xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 shrink-0">
                <Briefcase className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-heading font-bold text-foreground">My Contracts</h1>
                <p className="text-sm text-muted-foreground">
                  {isLoading ? "Loading…" : `${(contracts ?? []).length} contracts posted`}
                </p>
              </div>
            </div>
            <Button
              className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700 w-full sm:w-auto"
              asChild
            >
              <Link to="/recruiter/post-contract">
                <PlusCircle className="h-4 w-4 mr-1.5" /> Post New Contract
              </Link>
            </Button>
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
            <p className="font-heading font-semibold text-foreground">Failed to load contracts</p>
          </div>
        )}

        {!isLoading && !isError && (contracts ?? []).length === 0 && (
          <div className="text-center py-20">
            <Briefcase className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-heading font-semibold text-foreground">No contracts posted yet</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Post your first contract to reach thousands of active IT contractors.</p>
            <Button
              className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700"
              asChild
            >
              <Link to="/recruiter/post-contract">
                <PlusCircle className="h-4 w-4 mr-1.5" /> Post a Contract
              </Link>
            </Button>
          </div>
        )}

        {!isLoading && !isError && (contracts ?? []).length > 0 && (
          <div className="space-y-4">
            {(contracts ?? []).map((contract) => (
              <div key={contract.id} className="rounded-xl border bg-card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Title + status */}
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-heading font-semibold text-foreground">{contract.title}</h3>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          contract.status === "active"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "border-muted bg-muted text-muted-foreground"
                        }`}
                      >
                        {contract.status === "active" ? (
                          <><CheckCircle2 className="h-3 w-3 mr-1" />Active</>
                        ) : (
                          <><XCircle className="h-3 w-3 mr-1" />Closed</>
                        )}
                      </Badge>
                    </div>

                    {/* Meta */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      {contract.company && <span>{contract.company}</span>}
                      {contract.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />{contract.location}
                        </span>
                      )}
                      {contract.pay_rate && (
                        <span className="flex items-center gap-1">
                          <Banknote className="h-3.5 w-3.5" />{contract.pay_rate}
                        </span>
                      )}
                      {contract.ir35_status && (
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{contract.ir35_status}</span>
                      )}
                      {contract.work_type && (
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{contract.work_type}</span>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground mt-2">Posted {formatDate(contract.created_at)}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleStatus.mutate({ id: contract.id, status: contract.status })}
                      className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title={contract.status === "active" ? "Close contract" : "Reactivate contract"}
                    >
                      {contract.status === "active"
                        ? <ToggleRight className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        : <ToggleLeft className="h-5 w-5" />
                      }
                    </button>

                    {confirmDelete === contract.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { deleteContract.mutate(contract.id); setConfirmDelete(null); }}
                          className="px-2 py-1 rounded text-xs text-destructive hover:bg-destructive/10 transition-colors font-medium"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="px-2 py-1 rounded text-xs text-muted-foreground hover:bg-muted transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(contract.id)}
                        className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Delete contract"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Description preview */}
                {contract.description && (
                  <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{contract.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}
