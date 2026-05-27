import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, X } from "lucide-react";

interface AuthModalProps {
  onClose: () => void;
  /** Path to navigate to after successful sign-in. Defaults to /contracts. */
  redirectTo?: string;
}

export default function AuthModal({ onClose, redirectTo }: AuthModalProps) {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const reset = () => {
    setEmail("");
    setPassword("");
    setError(null);
    setLoading(false);
    setConfirmed(false);
  };

  const switchTab = (t: "signin" | "signup") => {
    reset();
    setTab(t);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (tab === "signin") {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        onClose();
        navigate(redirectTo ?? "/contracts");
      }
    } else {
      const { error } = await signUp(email, password);
      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        setConfirmed(true);
        setLoading(false);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-md rounded-2xl bg-card border shadow-xl p-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Tabs */}
        <div className="flex rounded-lg bg-accent p-1 mb-6">
          {(["signin", "signup"] as const).map((t) => (
            <button
              key={t}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
                tab === t ? "bg-background shadow text-foreground" : "text-muted-foreground"
              }`}
              onClick={() => switchTab(t)}
            >
              {t === "signin" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        {confirmed ? (
          <div className="text-center py-4">
            <p className="font-heading font-semibold text-foreground text-lg mb-2">Check your email</p>
            <p className="text-sm text-muted-foreground">
              We've sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then sign in.
            </p>
            <Button className="mt-6 w-full" onClick={() => switchTab("signin")}>
              Back to Sign In
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <p className="font-heading font-bold text-xl text-foreground">
                {tab === "signin" ? "Welcome back" : "Create your account"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {tab === "signin"
                  ? "Sign in to browse contracts"
                  : "Join IT ContractHub to access hundreds of contracts"}
              </p>
            </div>

            {/* Google OAuth */}
            <button
              type="button"
              onClick={async () => { setError(null); await signInWithGoogle(redirectTo); }}
              className="w-full flex items-center justify-center gap-3 rounded-lg border bg-background hover:bg-accent transition-colors px-4 py-2.5 text-sm font-medium text-foreground mb-4"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-2 text-muted-foreground">or continue with email</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="modal-email">Email</Label>
                <Input
                  id="modal-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="modal-password">Password</Label>
                  {tab === "signin" && (
                    <a href="/forgot-password" className="text-xs text-primary hover:underline">
                      Forgot password?
                    </a>
                  )}
                </div>
                <Input
                  id="modal-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" variant="hero" className="w-full" disabled={loading}>
                {loading
                  ? tab === "signin" ? "Signing in…" : "Creating account…"
                  : tab === "signin" ? "Sign In" : "Create Account"}
              </Button>
            </form>

            <p className="text-sm text-muted-foreground text-center mt-4">
              {tab === "signin" ? "Don't have an account? " : "Already have an account? "}
              <button
                className="text-primary hover:underline font-medium"
                onClick={() => switchTab(tab === "signin" ? "signup" : "signin")}
              >
                {tab === "signin" ? "Sign up" : "Sign in"}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
