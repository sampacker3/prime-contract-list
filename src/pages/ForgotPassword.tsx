import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, ArrowLeft, MailCheck } from "lucide-react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await resetPassword(email);
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-subtle">
      <SEO title="Reset Password — ContractHub" description="Reset your ContractHub password." canonical="/forgot-password" noIndex />
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border bg-card shadow-xl p-8">

          {sent ? (
            <div className="text-center">
              <MailCheck className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="font-heading font-bold text-xl text-foreground mb-2">Check your inbox</h2>
              <p className="text-sm text-muted-foreground mb-6">
                We've sent a password reset link to <strong>{email}</strong>. It may take a minute to arrive — check your spam folder too.
              </p>
              <Link to="/login">
                <Button variant="hero" className="w-full">Back to Sign In</Button>
              </Link>
            </div>
          ) : (
            <>
              <Link to="/login" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back to Sign In
              </Link>
              <h2 className="font-heading font-bold text-xl text-foreground mb-1">Reset your password</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Enter your email address and we'll send you a link to reset your password.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" variant="hero" className="w-full" disabled={loading}>
                  {loading ? "Sending…" : "Send Reset Link"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
