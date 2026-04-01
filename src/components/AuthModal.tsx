import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, X } from "lucide-react";

interface AuthModalProps {
  onClose: () => void;
}

export default function AuthModal({ onClose }: AuthModalProps) {
  const { signIn, signUp } = useAuth();
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
        navigate("/contracts");
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
                  : "Join ContractHub to access hundreds of contracts"}
              </p>
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
                <Label htmlFor="modal-password">Password</Label>
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
