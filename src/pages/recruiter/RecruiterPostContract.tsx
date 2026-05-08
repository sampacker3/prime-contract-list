import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase, Loader2, CheckCircle2, ArrowLeft, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RecruiterNavbar from "@/components/RecruiterNavbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

type ContractForm = {
  title: string
  company: string
  location: string
  pay_rate: string
  employment_type: string
  work_type: string
  ir35_status: string
  description: string
}

const BLANK: ContractForm = {
  title: "",
  company: "",
  location: "",
  pay_rate: "",
  employment_type: "Contract",
  work_type: "Remote",
  ir35_status: "Outside IR35",
  description: "",
};

export default function RecruiterPostContract() {
  const { user, isPro } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ContractForm>(BLANK);
  const [submitted, setSubmitted] = useState(false);

  const set = (key: keyof ContractForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const { mutate: postContract, isPending, error } = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("recruiter_contracts").insert({
        recruiter_id: user.id,
        title: form.title.trim(),
        company: form.company.trim() || null,
        location: form.location.trim() || null,
        pay_rate: form.pay_rate.trim() || null,
        employment_type: form.employment_type || null,
        work_type: form.work_type || null,
        ir35_status: form.ir35_status || null,
        description: form.description.trim() || null,
        status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruiter-recent-contracts"] });
      queryClient.invalidateQueries({ queryKey: ["recruiter-dashboard-stats"] });
      setSubmitted(true);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    postContract();
  };

  if (!isPro) {
    return (
      <div className="min-h-screen flex flex-col">
        <RecruiterNavbar />
        <main className="flex-1 container py-16 max-w-2xl text-center">
          <Briefcase className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <h1 className="text-2xl font-heading font-bold text-foreground mb-2">Subscribe to post contracts</h1>
          <p className="text-muted-foreground mb-6">Unlimited contract posts are included in the £175/month Recruiter plan.</p>
          <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700" asChild>
            <Link to="/recruiter/upgrade">Subscribe — £175/month</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col">
        <SEO title="Contract Posted — IT ContractHub Recruiter" description="Contract posted successfully." noIndex={true} canonical="/recruiter/post-contract" />
        <RecruiterNavbar />
        <main className="flex-1 container py-20 max-w-lg text-center">
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-2xl font-heading font-bold text-foreground mb-2">Contract posted!</h1>
          <p className="text-muted-foreground mb-8">Your contract is now live in the IT ContractHub feed and visible to thousands of active contractors.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700"
              onClick={() => { setForm(BLANK); setSubmitted(false); }}
            >
              Post Another Contract
            </Button>
            <Button variant="outline" asChild>
              <Link to="/recruiter/contracts">View My Contracts</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SEO title="Post a Contract — IT ContractHub Recruiter" description="Post an IT contract to reach active contractors." noIndex={true} canonical="/recruiter/post-contract" />
      <RecruiterNavbar />

      <section className="border-b bg-surface-subtle">
        <div className="container py-8 max-w-2xl">
          <Link to="/recruiter/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600">
              <Briefcase className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-heading font-bold text-foreground">Post a Contract</h1>
              <p className="text-sm text-muted-foreground">Reach thousands of active IT contractors</p>
            </div>
          </div>
        </div>
      </section>

      <main className="container py-8 flex-1 max-w-2xl">
        <div className="rounded-xl border bg-card/60 p-4 mb-6 flex items-start gap-2.5">
          <Info className="h-4 w-4 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Your contract will appear in the live feed alongside all scraped listings — visible to every active contractor browsing the platform.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
              {(error as Error).message ?? "Something went wrong — please try again."}
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="title">Job Title <span className="text-destructive">*</span></Label>
            <Input id="title" placeholder="e.g. Senior React Developer" value={form.title} onChange={set("title")} required className="h-11" />
          </div>

          {/* Company */}
          <div className="space-y-1.5">
            <Label htmlFor="company">Company / Agency Name</Label>
            <Input id="company" placeholder="e.g. Acme Ltd (optional)" value={form.company} onChange={set("company")} className="h-11" />
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <Label htmlFor="location">Location</Label>
            <Input id="location" placeholder="e.g. London, Remote, Hybrid" value={form.location} onChange={set("location")} className="h-11" />
          </div>

          {/* Pay rate */}
          <div className="space-y-1.5">
            <Label htmlFor="pay_rate">Day / Hourly Rate</Label>
            <Input id="pay_rate" placeholder="e.g. £600–£700/day, £75/hr" value={form.pay_rate} onChange={set("pay_rate")} className="h-11" />
          </div>

          {/* Row: work type / IR35 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="work_type">Work Type</Label>
              <select
                id="work_type"
                value={form.work_type}
                onChange={set("work_type")}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option>Remote</option>
                <option>Hybrid</option>
                <option>On-site</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ir35_status">IR35 Status</Label>
              <select
                id="ir35_status"
                value={form.ir35_status}
                onChange={set("ir35_status")}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option>Outside IR35</option>
                <option>Inside IR35</option>
                <option>TBD</option>
                <option>Not stated</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Job Description</Label>
            <textarea
              id="description"
              rows={8}
              placeholder="Full role description, requirements, responsibilities..."
              value={form.description}
              onChange={set("description")}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-base rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700"
            disabled={isPending || !form.title.trim()}
          >
            {isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Posting…</>
            ) : (
              <><Briefcase className="h-4 w-4 mr-2" /> Post Contract</>
            )}
          </Button>
        </form>
      </main>

      <Footer />
    </div>
  );
}
