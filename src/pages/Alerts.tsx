import { useState } from "react";
import { Mail, Plus, Trash2, Bell, Search, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { useAlerts } from "@/hooks/useAlerts";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";

const AlertsPage = () => {
  const { alerts, isLoading, createAlert, deleteAlert, toggleAlert } = useAlerts();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newKeyword, setNewKeyword] = useState("");
  const [cvLoading, setCvLoading] = useState(false);
  const [cvDone, setCvDone] = useState(false);
  const [cvError, setCvError] = useState(false);
  const [cvSkillsAdded, setCvSkillsAdded] = useState<string[]>([]);

  const handleCVAlerts = async () => {
    if (!user) return;
    setCvLoading(true);
    setCvError(false);
    setCvDone(false);

    try {
      const { data } = await supabase
        .from("UserCVScrapeDetails")
        .select("KeySkills")
        .eq("UID", user.id)
        .maybeSingle();

      const skills: string[] = (data?.KeySkills as string[]) ?? [];
      if (!skills.length) { setCvError(true); setCvLoading(false); return; }

      // Only create alerts for skills not already covered
      const existingKeywords = alerts.map(a => a.keywords.toLowerCase());
      const newSkills = skills.filter(s => !existingKeywords.includes(s.toLowerCase()));

      await Promise.all(
        newSkills.map(skill =>
          supabase.from("alerts").insert({
            user_id: user.id,
            keywords: skill,
            enabled: true,
            frequency: "instant",
            match_count: 0,
          })
        )
      );

      setCvSkillsAdded(newSkills);
      setCvDone(true);
      queryClient.invalidateQueries({ queryKey: ['alerts', user.id] });
    } catch {
      setCvError(true);
    } finally {
      setCvLoading(false);
    }
  };

  const handleAdd = () => {
    if (!newKeyword.trim()) return;
    createAlert.mutate(newKeyword.trim(), { onSuccess: () => setNewKeyword("") });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Email Alerts — Get Notified About New IT Contracts"
        description="Set up email alerts for new IT contract roles. Choose your keywords and get notified instantly, daily, or weekly when matching contracts are posted."
        canonical="/alerts"
        noIndex={true}
      />
      <Navbar />

      <section className="border-b bg-surface-subtle">
        <div className="container py-8">
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">Email Alerts</h1>
          <p className="mt-2 text-muted-foreground">
            Get notified instantly when new contracts matching your keywords are posted.
          </p>
        </div>
      </section>

      <section className="container py-8 flex-1 max-w-3xl">
        {/* Add new alert */}
        <div className="rounded-xl border bg-card p-6 mb-8">
          <h2 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" /> Create New Alert
          </h2>
          <div className="flex gap-3">
            <Input
              placeholder="Enter keywords (e.g. Azure, Python, Remote London)..."
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="flex-1"
            />
            <Button variant="hero" onClick={handleAdd} disabled={createAlert.isPending}>
              {createAlert.isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <><Bell className="h-4 w-4 mr-1" /> Create Alert</>
              }
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            You'll receive an email as soon as a matching contract is posted.
          </p>
        </div>

        {/* CV-based alerts */}
        <div className="relative rounded-xl p-[1.5px] mb-8"
          style={{
            background: "linear-gradient(135deg, #7c3aed, #3b82f6, #06b6d4, #a855f7, #7c3aed)",
            backgroundSize: "300% 300%",
            animation: "ai-border-spin 3s ease infinite",
          }}
        >
          <div className="rounded-[10px] bg-card p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="font-heading font-semibold text-foreground mb-1 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Alerts based on my CV
                </h2>
                <p className="text-sm text-muted-foreground">
                  Automatically create alerts from the skills extracted from your uploaded CV.
                </p>
              </div>
              <button
                onClick={handleCVAlerts}
                disabled={cvLoading || cvDone}
                className="relative shrink-0 flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-300"
                style={{
                  background: cvDone
                    ? "rgba(34,197,94,0.15)"
                    : "rgba(139,92,246,0.10)",
                  color: cvDone ? "#4ade80" : "#ffffff",
                  opacity: cvLoading ? 0.7 : 1,
                  cursor: cvLoading || cvDone ? "default" : "pointer",
                }}
              >
                {cvLoading
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : cvDone
                    ? <CheckCircle2 className="h-4 w-4" />
                    : <Sparkles className="h-4 w-4" style={{ filter: "drop-shadow(0 0 4px rgba(139,92,246,0.6))" }} />
                }
                {cvLoading ? "Loading skills…" : cvDone ? "Alerts created!" : "Create from CV"}
              </button>
            </div>

            {cvDone && cvSkillsAdded.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {cvSkillsAdded.map(skill => (
                  <span key={skill} className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs text-primary font-medium">
                    <CheckCircle2 className="h-3 w-3" />{skill}
                  </span>
                ))}
              </div>
            )}
            {cvDone && cvSkillsAdded.length === 0 && (
              <p className="mt-3 text-xs text-muted-foreground">All CV skills already have alerts set up.</p>
            )}
            {cvError && (
              <p className="mt-3 text-xs text-destructive">
                No CV skills found — make sure you've uploaded a CV in your account.
              </p>
            )}
          </div>
        </div>

        {/* Alert list */}
        <h2 className="font-heading font-semibold text-foreground mb-4">
          Your Alerts ({alerts.length})
        </h2>

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && alerts.length === 0 && (
          <div className="text-center py-16 rounded-xl border bg-card">
            <Mail className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-lg font-heading font-semibold text-foreground">No alerts set up</p>
            <p className="text-sm text-muted-foreground mt-1">Create your first alert above to get started</p>
          </div>
        )}

        {!isLoading && alerts.length > 0 && (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-xl border bg-card p-5 transition-all ${
                  alert.enabled ? "border-primary/10" : "opacity-60"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Search className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-heading font-semibold text-foreground truncate">{alert.keywords}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <Badge variant="secondary" className="text-xs capitalize">{alert.frequency}</Badge>
                      <span>{alert.match_count} matches</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Switch
                      checked={alert.enabled}
                      onCheckedChange={(checked) => toggleAlert.mutate({ id: alert.id, enabled: checked })}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => deleteAlert.mutate(alert.id)}
                      disabled={deleteAlert.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
};

export default AlertsPage;
