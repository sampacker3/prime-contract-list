import { useState } from "react";
import { Mail, Plus, Trash2, Bell, Search, Loader2, Sparkles, CheckCircle2, PauseCircle, PlayCircle, AlertTriangle } from "lucide-react";
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
  const { alerts, isLoading, createAlert, deleteAlert, toggleAlert, deleteAll, pauseAll, duplicateIds, deduplicateAlerts } = useAlerts();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newKeyword, setNewKeyword] = useState("");
  const [duplicateError, setDuplicateError] = useState(false);
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
    const trimmed = newKeyword.trim();
    if (!trimmed) return;
    setDuplicateError(false);
    createAlert.mutate(trimmed, {
      onSuccess: () => { setNewKeyword(""); setDuplicateError(false); },
      onError: (err) => {
        if (err.message === 'duplicate') setDuplicateError(true);
      },
    });
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
              onChange={(e) => { setNewKeyword(e.target.value); setDuplicateError(false); }}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className={`flex-1 ${duplicateError ? "border-destructive focus-visible:ring-destructive" : ""}`}
            />
            <Button variant="hero" onClick={handleAdd} disabled={createAlert.isPending}>
              {createAlert.isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <><Bell className="h-4 w-4 mr-1" /> Create Alert</>
              }
            </Button>
          </div>
          {duplicateError ? (
            <p className="text-xs text-destructive mt-2">
              You already have an alert for "{newKeyword.trim()}" — no duplicate created.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-2">
              You'll receive an email as soon as a matching contract is posted.
            </p>
          )}
        </div>

        {/* CV-based alerts */}
        <div className="rounded-xl border bg-card mb-8 overflow-hidden">
          <button
            onClick={handleCVAlerts}
            disabled={cvLoading || cvDone}
            className="w-full flex items-center gap-3 px-5 py-4 hover:bg-accent transition-colors text-left disabled:cursor-default"
          >
            <div
              className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6, #06b6d4)" }}
            >
              {cvLoading
                ? <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
                : cvDone
                  ? <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                  : <Sparkles className="h-3.5 w-3.5 text-white" />
              }
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {cvLoading ? "Loading CV skills…" : cvDone ? "Alerts created from CV!" : "Create alerts based on my CV"}
              </p>
              <p className="text-xs text-muted-foreground">
                {cvDone && cvSkillsAdded.length > 0
                  ? `Added ${cvSkillsAdded.length} alert${cvSkillsAdded.length !== 1 ? "s" : ""} from your CV skills`
                  : cvDone
                    ? "All CV skills already have alerts set up"
                    : "Automatically create alerts from skills on your uploaded CV"}
              </p>
            </div>
          </button>

          {cvDone && cvSkillsAdded.length > 0 && (
            <div className="px-5 pb-4 flex flex-wrap gap-2">
              {cvSkillsAdded.map(skill => (
                <span key={skill} className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs text-primary font-medium">
                  <CheckCircle2 className="h-3 w-3" />{skill}
                </span>
              ))}
            </div>
          )}
          {cvError && (
            <p className="px-5 pb-4 text-xs text-destructive">
              No CV skills found — make sure you've uploaded a CV in your account.
            </p>
          )}
        </div>

        {/* Duplicate cleanup banner */}
        {duplicateIds.length > 0 && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 mb-6">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              <p className="text-sm text-foreground">
                You have <span className="font-semibold">{duplicateIds.length}</span> duplicate alert{duplicateIds.length !== 1 ? "s" : ""} — these won't send any extra emails, but you can tidy them up.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 text-xs"
              onClick={() => deduplicateAlerts.mutate()}
              disabled={deduplicateAlerts.isPending}
            >
              {deduplicateAlerts.isPending
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : "Remove duplicates"
              }
            </Button>
          </div>
        )}

        {/* Alert list */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h2 className="font-heading font-semibold text-foreground">
            Your Alerts ({alerts.length})
          </h2>
          {alerts.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => pauseAll.mutate(alerts.some(a => a.enabled) ? false : true)}
                disabled={pauseAll.isPending}
                className="text-xs gap-1.5"
              >
                {pauseAll.isPending
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : alerts.some(a => a.enabled)
                    ? <PauseCircle className="h-3.5 w-3.5" />
                    : <PlayCircle className="h-3.5 w-3.5" />
                }
                {alerts.some(a => a.enabled) ? "Pause all" : "Resume all"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => deleteAll.mutate()}
                disabled={deleteAll.isPending}
                className="text-xs gap-1.5 text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/60 hover:bg-destructive/5"
              >
                {deleteAll.isPending
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Trash2 className="h-3.5 w-3.5" />
                }
                Remove all
              </Button>
            </div>
          )}
        </div>

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
