import { useState } from "react";
import { Mail, Plus, Trash2, Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface Alert {
  id: number;
  keywords: string;
  enabled: boolean;
  frequency: string;
  matchCount: number;
}

const mockAlerts: Alert[] = [
  { id: 1, keywords: "Azure DevOps", enabled: true, frequency: "Instant", matchCount: 23 },
  { id: 2, keywords: "Python Data Engineer", enabled: true, frequency: "Instant", matchCount: 15 },
  { id: 3, keywords: "Microsoft Fabric", enabled: false, frequency: "Daily", matchCount: 8 },
];

const AlertsPage = () => {
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const [newKeyword, setNewKeyword] = useState("");

  const addAlert = () => {
    if (!newKeyword.trim()) return;
    setAlerts((prev) => [
      ...prev,
      { id: Date.now(), keywords: newKeyword.trim(), enabled: true, frequency: "Instant", matchCount: 0 },
    ]);
    setNewKeyword("");
  };

  const removeAlert = (id: number) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const toggleAlert = (id: number) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
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
              onKeyDown={(e) => e.key === "Enter" && addAlert()}
              className="flex-1"
            />
            <Button variant="hero" onClick={addAlert}>
              <Bell className="h-4 w-4 mr-1" /> Create Alert
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            You'll receive an email as soon as a matching contract is posted.
          </p>
        </div>

        {/* Alert list */}
        <h2 className="font-heading font-semibold text-foreground mb-4">Your Alerts ({alerts.length})</h2>
        
        {alerts.length === 0 ? (
          <div className="text-center py-16 rounded-xl border bg-card">
            <Mail className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-lg font-heading font-semibold text-foreground">No alerts set up</p>
            <p className="text-sm text-muted-foreground mt-1">Create your first alert above to get started</p>
          </div>
        ) : (
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
                      <Badge variant="secondary" className="text-xs">{alert.frequency}</Badge>
                      <span>{alert.matchCount} matches this week</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Switch
                      checked={alert.enabled}
                      onCheckedChange={() => toggleAlert(alert.id)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => removeAlert(alert.id)}
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
