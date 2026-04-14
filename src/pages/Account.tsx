import { useRef, useState, useEffect } from "react";
import { User, CreditCard, Mail, Settings, ExternalLink, CheckCircle, LogOut, FileText, Upload, Trash2, Download, Loader2, Lock, Eye, EyeOff } from "lucide-react";
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

const CV_BUCKET = "cvs";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

type Profile = {
  subscription_plan: 'free' | 'pro' | 'enterprise'
  subscription_active: boolean
  subscription_renews_at: string | null
  stripe_customer_id: string | null
}

const AccountPage = () => {
  const { user, signOut, updatePassword } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { priceString } = useProPrice();
  const displayPrice = priceString ?? "£29.99/month";

  const [profile, setProfile] = useState<Profile | null>(null);
  const [stripeLoading, setStripeLoading] = useState<'checkout' | 'portal' | null>(null);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  const [cvName, setCvName] = useState<string | null>(null);
  const [cvUploading, setCvUploading] = useState(false);
  const [cvDeleting, setCvDeleting] = useState(false);
  const [cvError, setCvError] = useState<string | null>(null);

  // Fetch real profile / subscription data
  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('subscription_plan, subscription_active, subscription_renews_at, stripe_customer_id')
      .eq('id', user.id)
      .single()
      .then(({ data }) => { if (data) setProfile(data as Profile); });
  }, [user]);

  // Read ?checkout= param — poll profile until webhook activates subscription
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') !== 'success' || !user) return;
    setCheckoutSuccess(true);
    window.history.replaceState({}, '', '/account');

    let attempts = 0;
    const maxAttempts = 12; // poll every 2s for up to 24s

    const poll = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('subscription_plan, subscription_active, subscription_renews_at, stripe_customer_id')
        .eq('id', user.id)
        .single();

      if (data) {
        setProfile(data as Profile);
        if ((data as Profile).subscription_active) {
          clearInterval(interval);
          setTimeout(() => setCheckoutSuccess(false), 8000);
          return;
        }
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
          // localStorage holds the original filename; storage confirms the file exists
          const saved = localStorage.getItem(`cv_filename_${user.id}`);
          setCvName(saved ?? "cv.pdf");
        }
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

      // Remove existing file first so we only need INSERT policy (no UPDATE needed)
      await supabase.storage.from(CV_BUCKET).remove([path]);

      const { error: uploadError } = await supabase.storage
        .from(CV_BUCKET)
        .upload(path, file, { contentType: "application/pdf" });
      if (uploadError) throw uploadError;

      localStorage.setItem(`cv_filename_${user.id}`, file.name);
      setCvName(file.name);
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
      await supabase.storage.from(CV_BUCKET).remove([`${user.id}/cv.pdf`]);
      localStorage.removeItem(`cv_filename_${user.id}`);
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
        title="My Account — ContractHub"
        description="Manage your ContractHub account, subscription plan, and email preferences."
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
        <div className="bg-green-50 border-b border-green-200">
          <div className="container max-w-3xl py-4 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
            <div>
              <p className="font-semibold text-green-800">Welcome to Pro! 🎉</p>
              <p className="text-sm text-green-700">Your subscription is now active. You have full access to all contracts and features.</p>
            </div>
          </div>
        </div>
      )}

      <section className="container py-8 flex-1 max-w-3xl space-y-6">
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

          {cvName ? (
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
            <Button
              variant="hero"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={cvUploading}
            >
              {cvUploading
                ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Uploading…</>
                : <><Upload className="h-4 w-4 mr-1" /> {cvName ? "Replace CV" : "Upload CV"}</>
              }
            </Button>
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
              <div className="rounded-lg bg-accent/50 p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-semibold text-foreground capitalize">
                        {profile.subscription_plan} Plan
                      </span>
                      <Badge className="bg-primary text-primary-foreground text-xs">Active</Badge>
                    </div>
                    {profile.subscription_renews_at && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {displayPrice} · Renews {new Date(profile.subscription_renews_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  <CheckCircle className="h-5 w-5 text-primary" />
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
              <p className="text-xs text-muted-foreground mt-3">
                Billing is handled securely via Stripe. Click "Manage Billing" to update your payment method, change plan, or download invoices.
              </p>
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

        {/* Profile */}
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-primary">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-heading font-semibold text-foreground">Profile</h2>
              <p className="text-sm text-muted-foreground">Your account details</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm font-medium text-foreground">{user?.email ?? "—"}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">Member since</span>
              <span className="text-sm font-medium text-foreground">{memberSince}</span>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-1" /> Edit Profile
            </Button>
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-1" /> Sign Out
            </Button>
          </div>
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
