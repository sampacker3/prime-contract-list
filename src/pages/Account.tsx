import { useRef, useState, useEffect, useMemo } from "react";
import { User, CreditCard, Mail, Settings, ExternalLink, CheckCircle, LogOut, FileText, Upload, Trash2, Download, Loader2, Lock, Eye, EyeOff, CalendarDays, Info, Sparkles, MapPin, Building2, ArrowRight, CheckCircle2, AlertCircle as AlertCircleIcon, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import SEO from "@/components/SEO";
import { supabase } from "@/lib/supabase";
import { useProPrice } from "@/hooks/useProPrice";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { rdtTrack, rdtIdentify } from "@/lib/reddit";

const CV_BUCKET = "cvs";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

type Profile = {
  subscription_plan: 'free' | 'pro' | 'enterprise' | 'recruiter'
  subscription_active: boolean
  subscription_renews_at: string | null
  stripe_customer_id: string | null
  full_name: string | null

}

type CvReview = {
  headline: string
  score: number
  strengths: string[]
  gaps: string[]
  quick_wins: string[]
}

type ScoredContract = {
  id: number
  JobTitle: string | null
  Company: string | null
  Location: string | null
  PayRate: string | null
  IR35Status: string | null
  WorkType: string | null
  score: number
  matchedSkills: string[]
}

const AccountPage = () => {
  const { user, loading, isPro, isTrial, trialEndsAt, proLoading, signOut, updatePassword } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { priceString, priceData } = useProPrice();
  const displayPrice = priceString ?? "£8.97/month";

  const queryClient = useQueryClient();
  const [stripeLoading, setStripeLoading] = useState<'checkout' | 'portal' | null>(null);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  const { data: profile } = useQuery<Profile | null>({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      // maybeSingle returns null instead of throwing when no row exists
      const { data } = await supabase
        .from('profiles')
        .select('subscription_plan, subscription_active, subscription_renews_at, stripe_customer_id, full_name')
        .eq('id', user!.id)
        .maybeSingle();

      // Google OAuth users may not have a profile row — create one
      if (!data) {
        await supabase.from('profiles').upsert({
          id: user!.id,
          email: user!.email ?? null,
          subscription_plan: 'free',
          subscription_active: false,
        });
        return null;
      }

      return data as Profile;
    },
    enabled: !!user,
    staleTime: 30 * 1000,
  });

  // Fetch user's key skills from CV scrape (Pro only)
  const { data: keySkills, isLoading: keySkillsLoading } = useQuery<string[]>({
    queryKey: ['cv-skills', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('UserCVScrapeDetails')
        .select('KeySkills')
        .eq('UID', user!.id)
        .maybeSingle();
      return (data?.KeySkills as string[]) ?? [];
    },
    enabled: !!user && isPro && !proLoading,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch recent contracts for skill matching (Pro only, only when we have skills)
  const { data: recentContracts, isLoading: contractsLoading } = useQuery({
    queryKey: ['contracts-for-matching'],
    queryFn: async () => {
      const { data } = await supabase
        .from('LinkedinScrapeResults')
        .select('id, JobTitle, Company, Location, Description, PayRate, IR35Status, WorkType')
        .order('created_at', { ascending: false })
        .limit(300);
      return data ?? [];
    },
    enabled: !!keySkills && keySkills.length > 0,
    staleTime: 10 * 60 * 1000,
  });

  // Score and rank contracts by skill match count
  const topMatchedContracts = useMemo<ScoredContract[]>(() => {
    if (!keySkills?.length || !recentContracts?.length) return [];
    const lowerSkills = keySkills.map(s => s.toLowerCase());

    return recentContracts
      .map(c => {
        const haystack = `${c.JobTitle ?? ''} ${c.Description ?? ''}`.toLowerCase();
        const matchedSkills = lowerSkills.filter(s => haystack.includes(s));
        return { ...c, score: matchedSkills.length, matchedSkills: matchedSkills.map(s =>
          keySkills[lowerSkills.indexOf(s)]
        )};
      })
      .filter(c => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [keySkills, recentContracts]);

  const [cvName, setCvName] = useState<string | null>(null);
  const [cvChecking, setCvChecking] = useState(true);

  // Contract end date

  // Populate end date from profile once loaded
  // CV Review
  const [cvReview, setCvReview] = useState<CvReview | null>(null);
  const [cvReviewLoading, setCvReviewLoading] = useState(false);
  const [cvReviewError, setCvReviewError] = useState<string | null>(null);
  const [cvReviewOpen, setCvReviewOpen] = useState(false);

  // Load saved review from DB on mount
  useEffect(() => {
    if (!user) return;
    supabase.from('cv_reviews').select('review').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      if (data?.review) setCvReview(data.review as CvReview);
    });
  }, [user]);

  const handleGetCvReview = async () => {
    if (!user) return;
    setCvReviewLoading(true);
    setCvReviewError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/cv-review`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          apikey: SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? 'Review failed');
      setCvReview(json.review as CvReview);
      setCvReviewOpen(true);
    } catch (err) {
      setCvReviewError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setCvReviewLoading(false);
    }
  };

  // Name editing
  const [nameEditing, setNameEditing] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const handleSaveName = async () => {
    if (!user) return;
    setNameSaving(true);
    setNameError(null);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: nameValue.trim() || null })
      .eq('id', user.id);
    if (error) {
      setNameError("Failed to save. Please try again.");
    } else {
      queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      setNameEditing(false);
    }
    setNameSaving(false);
  };
  const [cvUploading, setCvUploading] = useState(false);
  const [cvDeleting, setCvDeleting] = useState(false);
  const [cvError, setCvError] = useState<string | null>(null);

  // Redirect unauthenticated users to home
  useEffect(() => {
    if (!loading && !user) navigate("/");
  }, [user, loading]);

  // Read ?checkout= param — poll profile until webhook activates subscription
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') !== 'success' || !user) return;
    setCheckoutSuccess(true);
    window.history.replaceState({}, '', '/account');

    let attempts = 0;
    const maxAttempts = 12; // poll every 2s for up to 24s

    const poll = async () => {
      // refetchQueries waits for the fetch to complete before we read the cache
      await queryClient.refetchQueries({ queryKey: ['profile', user.id] });
      const cached = queryClient.getQueryData<Profile | null>(['profile', user.id]);

      if (cached?.subscription_active) {
        clearInterval(interval);
        // Reddit pixel: fire Purchase once subscription is confirmed
        if (user?.email) rdtIdentify(user.email, user.id);
        rdtTrack('Purchase', {
          value: priceData ? priceData.amount / 100 : 8.97,
          currency: (priceData?.currency ?? 'gbp').toUpperCase(),
        });
        setTimeout(() => setCheckoutSuccess(false), 8000);
        return;
      }

      attempts++;
      if (attempts >= maxAttempts) clearInterval(interval);
    };

    poll(); // immediate first check
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [user]);

  const callEdgeFunction = async (fn: string, body?: Record<string, string>): Promise<{ url?: string; error?: string }> => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json();
    if (!res.ok || !json.url) {
      return { error: json.error || json.message || `Request failed (${res.status})` };
    }
    return json;
  };

  const handleUpgrade = async () => {
    setStripeError(null);
    setStripeLoading('checkout');
    try {
      const origin = window.location.origin;
      const { url, error } = await callEdgeFunction('create-checkout-session', {
        success_url: `${origin}/account?checkout=success`,
        cancel_url: `${origin}/account?checkout=cancelled`,
      });
      if (error || !url) { setStripeError(error ?? 'No checkout URL returned'); setStripeLoading(null); return; }
      window.location.href = url;
    } catch (e) {
      setStripeError('Something went wrong. Please try again.');
      setStripeLoading(null);
    }
  };

  const handleManageBilling = async () => {
    setStripeError(null);
    setStripeLoading('portal');
    try {
      const { url, error } = await callEdgeFunction('create-portal-session', {
        return_url: `${window.location.origin}/account`,
      });
      if (error || !url) { setStripeError(error ?? 'No portal URL returned'); setStripeLoading(null); return; }
      window.location.href = url;
    } catch (e) {
      setStripeError('Something went wrong. Please try again.');
      setStripeLoading(null);
    }
  };

  // Check storage directly for an existing CV — source of truth
  useEffect(() => {
    if (!user) return;
    supabase.storage
      .from(CV_BUCKET)
      .list(user.id)
      .then(({ data }) => {
        const existing = data?.find((f) => f.name === "cv.pdf");
        if (existing) {
          const saved = localStorage.getItem(`cv_filename_${user.id}`);
          setCvName(saved ?? "cv.pdf");
        }
        setCvChecking(false);
      });
  }, [user]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.type !== "application/pdf") {
      setCvError("Only PDF files are accepted.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setCvError("File must be under 5 MB.");
      return;
    }
    setCvError(null);
    setCvUploading(true);
    try {
      const path = `${user.id}/cv.pdf`;

      // Step 1: Upload file to storage (upsert overwrites existing)
      const { error: uploadError } = await supabase.storage
        .from(CV_BUCKET)
        .upload(path, file, { contentType: "application/pdf", upsert: true });
      if (uploadError) throw uploadError;

      // Write filename to profiles so recruiters can discover this candidate
      await supabase.from('profiles').update({ cv_filename: file.name }).eq('id', user.id);

      localStorage.setItem(`cv_filename_${user.id}`, file.name);
      setCvName(file.name);
      await queryClient.invalidateQueries({ queryKey: ["cv-exists", user.id] });

      // Step 2: Generate a fresh signed URL so n8n always fetches the latest file, bypassing CDN cache
      const { data: signedUrlData } = await supabase.storage
        .from(CV_BUCKET)
        .createSignedUrl(path, 300); // valid for 5 minutes

      // Step 3: Notify n8n webhook with the signed URL to process the uploaded CV
      await fetch("https://sampacker.app.n8n.cloud/webhook/d81d708e-cd40-44e8-b80f-a12ac8dd0d97", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          file_name: file.name,
          signed_url: signedUrlData?.signedUrl,
        }),
      });
    } catch (err: unknown) {
      setCvError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setCvUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDownload = async () => {
    if (!user) return;
    const { data } = await supabase.storage
      .from(CV_BUCKET)
      .createSignedUrl(`${user.id}/cv.pdf`, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const handleDelete = async () => {
    if (!user) return;
    setCvDeleting(true);
    try {
      // Delete storage file, embeddings, reviews, and clear cv_filename on profile in parallel
      await Promise.all([
        supabase.storage.from(CV_BUCKET).remove([`${user.id}/cv.pdf`]),
        supabase.from("usercvs").delete().contains("metadata", { user_id: user.id }),
        supabase.from("cv_reviews").delete().eq("user_id", user.id),
        supabase.from("profiles").update({ cv_filename: null }).eq("id", user.id),
      ]);
      setCvReview(null);
      setCvReviewOpen(false);
      // Brief pause to let Supabase propagate before UI allows a new upload
      await new Promise((resolve) => setTimeout(resolve, 1000));
      localStorage.removeItem(`cv_filename_${user.id}`);
      // Bust the cv-exists cache so useCVExists reflects the deletion immediately
      await queryClient.invalidateQueries({ queryKey: ["cv-exists", user.id] });
      setCvName(null);
    } finally {
      setCvDeleting(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const [pwOpen, setPwOpen] = useState(false);
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwShow, setPwShow] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    if (pwNew.length < 6) { setPwError("Password must be at least 6 characters."); return; }
    if (pwNew !== pwConfirm) { setPwError("Passwords do not match."); return; }
    setPwLoading(true);
    const { error } = await updatePassword(pwNew);
    if (error) {
      setPwError(error.message);
    } else {
      setPwSuccess(true);
      setPwNew(""); setPwConfirm("");
      setTimeout(() => { setPwSuccess(false); setPwOpen(false); }, 2500);
    }
    setPwLoading(false);
  };

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
    : "—";

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="My Account — IT ContractHub"
        description="Manage your IT ContractHub account, subscription plan, and email preferences."
        canonical="/account"
        noIndex={true}
      />
      <Navbar />

      <section className="border-b bg-surface-subtle">
        <div className="container py-8">
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">My Account</h1>
          <p className="mt-2 text-muted-foreground">Manage your subscription and account settings.</p>
        </div>
      </section>

      {checkoutSuccess && (
        <div className="bg-green-50 border-b border-green-200 dark:bg-green-950/40 dark:border-green-900">
          <div className="container max-w-3xl py-4 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
            <div>
              <p className="font-semibold text-green-800 dark:text-green-300">
                {isTrial ? "Your free trial has started! 🎉" : "Welcome to Pro! 🎉"}
              </p>
              <p className="text-sm text-green-700 dark:text-green-400">
                {isTrial && trialEndsAt
                  ? `You have full Pro access until ${trialEndsAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}. No charge until then.`
                  : "Your subscription is now active. You have full access to all contracts and features."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Trial status banner — shown persistently while on trial */}
      {isTrial && trialEndsAt && !checkoutSuccess && (
        <div className="border-b bg-primary/5 border-primary/20">
          <div className="container max-w-3xl py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <Zap className="h-4 w-4 text-primary shrink-0" />
              <p className="text-sm text-foreground">
                <span className="font-semibold">Free trial active</span>
                {" — "}full Pro access until{" "}
                <span className="font-medium">
                  {trialEndsAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
                . Your card will be charged after that.
              </p>
            </div>
          </div>
        </div>
      )}

      <section className="container py-8 flex-1 max-w-3xl space-y-6">
        {/* Top Matched Contracts — skeleton while loading, real content or nothing when done */}
        {isPro && !proLoading && (keySkillsLoading || contractsLoading) && (
          <div className="rounded-xl border bg-card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-lg bg-muted animate-pulse shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-36 rounded bg-muted animate-pulse" />
                <div className="h-3 w-52 rounded bg-muted animate-pulse" />
              </div>
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-lg border p-4">
                  <div className="h-4 w-2/3 rounded bg-muted animate-pulse mb-2" />
                  <div className="h-3 w-1/2 rounded bg-muted animate-pulse mb-3" />
                  <div className="flex gap-1.5">
                    <div className="h-5 w-14 rounded bg-muted animate-pulse" />
                    <div className="h-5 w-16 rounded bg-muted animate-pulse" />
                    <div className="h-5 w-12 rounded bg-muted animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isPro && !proLoading && !keySkillsLoading && !contractsLoading && topMatchedContracts.length > 0 && (
          <div className="rounded-xl border bg-card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-heading font-semibold text-foreground">Matched For You</h2>
                <p className="text-sm text-muted-foreground">Top contracts based on your CV skills</p>
              </div>
            </div>

            <div className="space-y-3">
              {topMatchedContracts.map(contract => (
                <a
                  key={contract.id}
                  href={`/contract/${contract.id}`}
                  className="block rounded-lg border bg-background hover:bg-accent/40 transition-colors p-4 group"
                >
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="font-medium text-foreground text-sm leading-snug group-hover:text-primary transition-colors min-w-0 flex-1">
                      {contract.JobTitle ?? "Untitled Role"}
                    </p>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-0.5" />
                  </div>

                  {/* Company + location */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground mb-2">
                    {contract.Company && (
                      <span className="flex items-center gap-1 min-w-0">
                        <Building2 className="h-3 w-3 shrink-0" />
                        <span className="truncate max-w-[160px]">{contract.Company}</span>
                      </span>
                    )}
                    {contract.Location && (
                      <span className="flex items-center gap-1 min-w-0">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate max-w-[160px]">{contract.Location}</span>
                      </span>
                    )}
                  </div>

                  {/* Badges inline */}
                  {(contract.PayRate || contract.IR35Status) && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {contract.PayRate && (
                        <Badge variant="secondary" className="text-xs">{contract.PayRate}</Badge>
                      )}
                      {contract.IR35Status && (
                        <Badge variant="outline" className="text-xs">{contract.IR35Status}</Badge>
                      )}
                    </div>
                  )}

                  {/* Skill tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {contract.matchedSkills.slice(0, 5).map(skill => (
                      <span key={skill} className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {skill}
                      </span>
                    ))}
                    {contract.matchedSkills.length > 5 && (
                      <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        +{contract.matchedSkills.length - 5} more
                      </span>
                    )}
                  </div>
                </a>
              ))}
            </div>

            <a href="/contracts" className="mt-4 flex items-center gap-1 text-xs text-primary hover:underline">
              Browse all contracts <ArrowRight className="h-3 w-3" />
            </a>
          </div>
        )}

        {/* Profile */}
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-primary">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-heading font-semibold text-foreground">Profile</h2>
              <p className="text-sm text-muted-foreground">Your account details</p>
            </div>
          </div>

          {!profile ? (
            /* Skeleton rows while profile loads */
            <div className="rounded-lg border divide-y mb-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="px-4 py-3">
                  <div className="h-3 w-16 rounded bg-muted animate-pulse mb-1.5" />
                  <div className="h-4 w-40 rounded bg-muted animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
          <div className="rounded-lg border divide-y mb-4">
            {/* Name row */}
            <div className="px-4 py-3">
              {nameEditing ? (
                <div className="flex flex-col gap-2">
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  <Input
                    value={nameValue}
                    onChange={e => setNameValue(e.target.value)}
                    placeholder="Your full name"
                    className="h-8 text-sm"
                    autoFocus
                  />
                  {nameError && <p className="text-xs text-destructive">{nameError}</p>}
                  <div className="flex gap-2">
                    <Button size="sm" variant="hero" onClick={handleSaveName} disabled={nameSaving}>
                      {nameSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setNameEditing(false)} disabled={nameSaving}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Name</p>
                    <p className="text-sm font-medium text-foreground">
                      {profile?.full_name ?? <span className="text-muted-foreground italic">Not set</span>}
                    </p>
                  </div>
                  <button
                    className="text-xs text-primary hover:underline shrink-0 ml-4"
                    onClick={() => { setNameValue(profile?.full_name ?? ""); setNameEditing(true); setNameError(null); }}
                  >
                    {profile?.full_name ? "Edit" : "Add name"}
                  </button>
                </div>
              )}
            </div>

            {/* Email row */}
            <div className="px-4 py-3">
              <p className="text-xs text-muted-foreground mb-0.5">Email</p>
              <p className="text-sm font-medium text-foreground">{user?.email ?? "—"}</p>
            </div>

            {/* Member since row */}
            <div className="px-4 py-3">
              <p className="text-xs text-muted-foreground mb-0.5">Member since</p>
              <p className="text-sm font-medium text-foreground">{memberSince}</p>
            </div>
          </div>
          )}

          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-1" /> Sign Out
          </Button>
        </div>

        {/* CV Upload */}
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-heading font-semibold text-foreground">Your CV</h2>
              <p className="text-sm text-muted-foreground">Upload a PDF — max 5 MB</p>
            </div>
          </div>

          {cvChecking ? (
            <div className="rounded-lg border p-4 mb-4 flex items-center gap-3">
              <div className="h-5 w-5 rounded bg-muted animate-pulse shrink-0" />
              <div className="h-4 w-40 rounded bg-muted animate-pulse" />
            </div>
          ) : cvName ? (
            <div className="rounded-lg bg-accent/50 border p-4 flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <span className="text-sm font-medium text-foreground truncate">{cvName}</span>
              </div>
              <Badge variant="secondary" className="text-xs shrink-0">Uploaded</Badge>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-center mb-4">
              <FileText className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No CV uploaded yet</p>
            </div>
          )}

          {cvError && (
            <p className="text-sm text-destructive mb-3">{cvError}</p>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleUpload}
          />

          <div className="flex flex-wrap gap-2">
            {!cvName && (
              <Button
                variant="hero"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={cvUploading}
              >
                {cvUploading
                  ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Uploading…</>
                  : <><Upload className="h-4 w-4 mr-1" /> Upload CV</>
                }
              </Button>
            )}
            {cvName && (
              <>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-1" /> Download
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={handleDelete}
                  disabled={cvDeleting}
                >
                  {cvDeleting
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <><Trash2 className="h-4 w-4 mr-1" /> Delete</>
                  }
                </Button>
              </>
            )}
          </div>

          {/* CV Review — only when CV is uploaded */}
          {cvName && isPro && (
            <div className="mt-5 pt-5 border-t">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <p className="font-medium text-sm text-foreground">AI CV Review</p>
                  {cvReview && (
                    <span className="text-xs text-muted-foreground">
                      · Score: <span className={`font-semibold ${cvReview.score >= 70 ? 'text-green-600 dark:text-green-400' : cvReview.score >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-red-500'}`}>{cvReview.score}/100</span>
                    </span>
                  )}
                </div>
                <Button
                  size="sm"
                  variant={cvReview ? "outline" : "hero"}
                  onClick={handleGetCvReview}
                  disabled={cvReviewLoading}
                  className="shrink-0 text-xs h-8"
                >
                  {cvReviewLoading
                    ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Analysing…</>
                    : cvReview
                      ? <><Sparkles className="h-3.5 w-3.5 mr-1.5" /> Refresh Review</>
                      : <><Sparkles className="h-3.5 w-3.5 mr-1.5" /> Get CV Review</>
                  }
                </Button>
              </div>

              {cvReviewError && (
                <p className="text-xs text-destructive mb-2">{cvReviewError}</p>
              )}

              {!cvReview && !cvReviewLoading && (
                <p className="text-xs text-muted-foreground">
                  Get personalised feedback on your CV based on your skills and the contract types you're targeting.
                </p>
              )}

              {cvReview && (
                <div>
                  {/* Headline + toggle */}
                  <button
                    onClick={() => setCvReviewOpen(o => !o)}
                    className="w-full text-left"
                  >
                    <p className="text-sm text-foreground italic mb-1">"{cvReview.headline}"</p>
                    <p className="text-xs text-primary hover:underline">{cvReviewOpen ? 'Hide details ↑' : 'Show full review ↓'}</p>
                  </button>

                  {cvReviewOpen && (
                    <div className="mt-4 space-y-4">
                      {/* Score bar */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">Overall CV score</span>
                          <span className={`text-xs font-bold ${cvReview.score >= 70 ? 'text-green-600 dark:text-green-400' : cvReview.score >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-red-500'}`}>{cvReview.score}/100</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full ${cvReview.score >= 70 ? 'bg-green-500' : cvReview.score >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${cvReview.score}%` }}
                          />
                        </div>
                      </div>

                      {/* Strengths */}
                      <div>
                        <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Strengths
                        </p>
                        <ul className="space-y-1.5">
                          {cvReview.strengths.map((s, i) => (
                            <li key={i} className="text-xs text-foreground flex items-start gap-2">
                              <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Gaps */}
                      <div>
                        <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <AlertCircleIcon className="h-3.5 w-3.5 text-amber-500" /> Areas to improve
                        </p>
                        <ul className="space-y-1.5">
                          {cvReview.gaps.map((g, i) => (
                            <li key={i} className="text-xs text-foreground flex items-start gap-2">
                              <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                              {g}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Quick wins */}
                      <div>
                        <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <Zap className="h-3.5 w-3.5 text-primary" /> Quick wins
                        </p>
                        <ul className="space-y-1.5">
                          {cvReview.quick_wins.map((q, i) => (
                            <li key={i} className="text-xs text-foreground flex items-start gap-2">
                              <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                              {q}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Subscription card */}
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-primary">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-heading font-semibold text-foreground">Subscription</h2>
              <p className="text-sm text-muted-foreground">Manage your plan and billing</p>
            </div>
          </div>

          {stripeError && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg mb-4">
              <AlertCircle className="h-4 w-4 shrink-0" /> {stripeError}
            </div>
          )}

          {profile?.subscription_active ? (
            <>
              {/* Plan status */}
              <div className={`rounded-lg p-4 mb-3 ${isTrial ? 'bg-primary/5 border border-primary/20' : 'bg-accent/50'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-semibold text-foreground capitalize">
                      {profile.subscription_plan} Plan
                    </span>
                    {isTrial
                      ? <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">Free Trial</Badge>
                      : <Badge className="bg-primary text-primary-foreground text-xs">Active</Badge>
                    }
                  </div>
                  <CheckCircle className="h-5 w-5 text-primary" />
                </div>
                {isTrial && trialEndsAt && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Trial ends {trialEndsAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} — you won't be charged until then.
                  </p>
                )}
              </div>

              {/* Billing details rows */}
              <div className="divide-y rounded-lg border mb-4">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">Monthly price</span>
                  <span className="text-sm font-semibold text-foreground">{displayPrice}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {isTrial ? 'Trial ends / first charge' : 'Next billing date'}
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {isTrial && trialEndsAt
                      ? trialEndsAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                      : profile.subscription_renews_at
                        ? new Date(profile.subscription_renews_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                        : '—'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="hero" size="sm" onClick={handleManageBilling} disabled={stripeLoading === 'portal'}>
                  {stripeLoading === 'portal'
                    ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Loading…</>
                    : <><CreditCard className="h-4 w-4 mr-1" /> Manage Billing <ExternalLink className="h-3 w-3 ml-1" /></>
                  }
                </Button>
              </div>

              <div className="flex items-start gap-2 mt-3 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2.5">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <p>
                  You can cancel your subscription at any time via "Manage Billing". Your Pro access will remain active until{" "}
                  <span className="font-medium text-foreground">
                    {profile.subscription_renews_at
                      ? new Date(profile.subscription_renews_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                      : 'the end of your billing period'}
                  </span>
                  . No refunds are issued for the remaining period.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-lg border border-dashed p-4 mb-4 text-center">
                <p className="font-heading font-semibold text-foreground mb-1">Free Plan</p>
                <p className="text-sm text-muted-foreground mb-3">Upgrade to Pro for full access to all contracts, rates, and early alerts.</p>
                <ul className="text-sm text-muted-foreground space-y-1 mb-4 text-left max-w-xs mx-auto">
                  {["Unlimited contract browsing","Full job descriptions & company details","Early access — updated every 10 mins","Email alerts with instant notifications","Save & bookmark contracts"].map(f => (
                    <li key={f} className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
              <Button variant="hero" onClick={handleUpgrade} disabled={stripeLoading === 'checkout'}>
                {stripeLoading === 'checkout'
                  ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Redirecting to Stripe…</>
                  : <><CreditCard className="h-4 w-4 mr-1" /> Upgrade to Pro — {displayPrice}</>
                }
              </Button>
              <p className="text-xs text-muted-foreground mt-3">Secure checkout via Stripe. Cancel anytime.</p>
            </>
          )}
        </div>

        {/* Change Password */}
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-primary">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-heading font-semibold text-foreground">Password</h2>
                <p className="text-sm text-muted-foreground">Update your account password</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => { setPwOpen(o => !o); setPwError(null); setPwSuccess(false); }}>
              {pwOpen ? "Cancel" : "Change Password"}
            </Button>
          </div>

          {pwOpen && (
            <form onSubmit={handleChangePassword} className="mt-5 space-y-4 border-t pt-5">
              {pwSuccess && (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-3 rounded-lg">
                  <CheckCircle className="h-4 w-4 shrink-0" /> Password updated successfully.
                </div>
              )}
              {pwError && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {pwError}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="pw-new">New password</Label>
                <div className="relative">
                  <Input
                    id="pw-new"
                    type={pwShow ? "text" : "password"}
                    placeholder="At least 6 characters"
                    value={pwNew}
                    onChange={e => setPwNew(e.target.value)}
                    className="pr-10"
                    required
                  />
                  <button type="button" onClick={() => setPwShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {pwShow ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pw-confirm">Confirm new password</Label>
                <Input
                  id="pw-confirm"
                  type={pwShow ? "text" : "password"}
                  placeholder="Re-enter new password"
                  value={pwConfirm}
                  onChange={e => setPwConfirm(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" variant="hero" size="sm" disabled={pwLoading}>
                {pwLoading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Updating…</> : "Update Password"}
              </Button>
            </form>
          )}
        </div>

        {/* Email Preferences */}
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-primary">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-heading font-semibold text-foreground">Email Preferences</h2>
              <p className="text-sm text-muted-foreground">Control what emails you receive</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-foreground">Contract alert emails</span>
              <Badge variant="secondary" className="text-xs">3 active alerts</Badge>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-foreground">Weekly market digest</span>
              <Badge variant="outline" className="text-xs">Enabled</Badge>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-foreground">Product updates</span>
              <Badge variant="outline" className="text-xs">Enabled</Badge>
            </div>
          </div>
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <a href="/alerts">Manage Alerts</a>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AccountPage;
