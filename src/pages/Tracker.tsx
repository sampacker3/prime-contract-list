import { useState } from "react";
import {
  Plus, MapPin, Building2, Trash2, Loader2,
  ChevronDown, ChevronUp, StickyNote, CheckCircle2,
  BriefcaseBusiness, CalendarDays, TrendingUp, X,
  ArrowRight, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Link } from "react-router-dom";
import { useApplications, type Application, type ApplicationStatus } from "@/hooks/useApplications";

/* ── Config ───────────────────────────────────────────────── */

const COLUMNS: {
  status: ApplicationStatus;
  label: string;
  colour: string;
  badge: string;
  dot: string;
}[] = [
  { status: "applied",   label: "Applied",   colour: "border-primary/30 bg-primary/5",      badge: "bg-primary/10 text-primary",    dot: "bg-primary" },
  { status: "interview", label: "Interview",  colour: "border-amber-500/30 bg-amber-500/5",  badge: "bg-amber-500/10 text-amber-500", dot: "bg-amber-500" },
  { status: "offered",   label: "Offered",    colour: "border-green-500/30 bg-green-500/5",  badge: "bg-green-500/10 text-green-600", dot: "bg-green-500" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/* ── Add Application Modal ────────────────────────────────── */

function AddModal({ onClose, prefill }: {
  onClose: () => void;
  prefill?: { job_title?: string; company?: string; location?: string; day_rate?: string; contract_id?: number };
}) {
  const { addApplication } = useApplications();
  const [jobTitle, setJobTitle]   = useState(prefill?.job_title  ?? "");
  const [company,  setCompany]    = useState(prefill?.company    ?? "");
  const [location, setLocation]   = useState(prefill?.location   ?? "");
  const [dayRate,  setDayRate]    = useState(prefill?.day_rate   ?? "");
  const [notes,    setNotes]      = useState("");
  const [status,   setStatus]     = useState<ApplicationStatus>("applied");
  const [appliedAt, setAppliedAt] = useState(new Date().toISOString().slice(0, 10));
  const [error,    setError]      = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle.trim()) { setError("Job title is required."); return; }
    await addApplication.mutateAsync({
      job_title: jobTitle.trim(),
      company:   company.trim()  || undefined,
      location:  location.trim() || undefined,
      day_rate:  dayRate.trim()  || undefined,
      notes:     notes.trim()    || undefined,
      status,
      applied_at: new Date(appliedAt).toISOString(),
      contract_id: prefill?.contract_id,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-md rounded-2xl bg-card border shadow-xl p-6">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
        <h2 className="font-heading font-bold text-lg text-foreground mb-5">Add Application</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="space-y-1.5">
            <Label>Job Title <span className="text-destructive">*</span></Label>
            <Input placeholder="e.g. Senior Python Developer" value={jobTitle} onChange={e => setJobTitle(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Company</Label>
              <Input placeholder="e.g. Deloitte" value={company} onChange={e => setCompany(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Day Rate</Label>
              <Input placeholder="e.g. £600/day" value={dayRate} onChange={e => setDayRate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Location</Label>
            <Input placeholder="e.g. London, UK (Remote)" value={location} onChange={e => setLocation(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as ApplicationStatus)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {COLUMNS.map(c => <option key={c.status} value={c.status}>{c.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Applied Date</Label>
              <Input type="date" value={appliedAt} onChange={e => setAppliedAt(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <textarea
              rows={3}
              placeholder="Interview notes, contacts, next steps..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="hero" className="flex-1" disabled={addApplication.isPending}>
              {addApplication.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Application"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Application Card ─────────────────────────────────────── */

function AppCard({ app, col }: { app: Application; col: typeof COLUMNS[0] }) {
  const { updateStatus, updateNotes, deleteApplication } = useApplications();
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(app.notes ?? "");
  const [editingNotes, setEditingNotes] = useState(false);

  const otherCols = COLUMNS.filter(c => c.status !== app.status);

  const saveNotes = async () => {
    await updateNotes.mutateAsync({ id: app.id, notes });
    setEditingNotes(false);
  };

  return (
    <div className={`rounded-xl border ${col.colour} bg-card transition-all`}>
      {/* Header */}
      <div
        className="p-4 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-heading font-semibold text-sm text-foreground leading-snug">
              {app.job_title}
            </p>
            {app.company && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <Building2 className="h-3 w-3 shrink-0" />
                <span className="truncate">{app.company}</span>
              </p>
            )}
            {app.location && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{app.location}</span>
              </p>
            )}
          </div>
          <button className="text-muted-foreground shrink-0 mt-0.5">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-3">
          {app.day_rate && (
            <span className="inline-flex items-center rounded-full bg-green-500/10 border border-green-500/20 px-2 py-0.5 text-xs font-semibold text-green-600 dark:text-green-400">
              {app.day_rate}
            </span>
          )}
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />{formatDate(app.applied_at)}
          </span>
          {app.notes && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <StickyNote className="h-3 w-3" />Note
            </span>
          )}
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-4">
          {/* Notes */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notes</p>
              {!editingNotes && (
                <button
                  onClick={() => setEditingNotes(true)}
                  className="text-xs text-primary hover:underline"
                >
                  {app.notes ? "Edit" : "Add note"}
                </button>
              )}
            </div>
            {editingNotes ? (
              <div className="space-y-2">
                <textarea
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { setNotes(app.notes ?? ""); setEditingNotes(false); }}>Cancel</Button>
                  <Button size="sm" variant="hero" className="text-xs h-7" onClick={saveNotes} disabled={updateNotes.isPending}>
                    {updateNotes.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {app.notes || <span className="italic opacity-50">No notes yet.</span>}
              </p>
            )}
          </div>

          {/* Quick links */}
          {app.contract_id && (
            <div className="flex flex-wrap gap-2">
              <Link
                to={`/contract/${app.contract_id}`}
                onClick={e => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
              >
                <ArrowRight className="h-3 w-3" /> View Contract
              </Link>
              <Link
                to={`/saved?cover=${app.contract_id}`}
                onClick={e => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
              >
                <FileText className="h-3 w-3" /> See Cover Letter
              </Link>
            </div>
          )}

          {/* Move to */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Move to</p>
            <div className="flex flex-wrap gap-2">
              {otherCols.map(c => (
                <button
                  key={c.status}
                  onClick={() => updateStatus.mutate({ id: app.id, status: c.status })}
                  disabled={updateStatus.isPending}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors hover:opacity-80 ${c.badge} border-current/20`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Delete */}
          <div className="pt-1">
            <button
              onClick={() => deleteApplication.mutate(app.id)}
              disabled={deleteApplication.isPending}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              {deleteApplication.isPending
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <Trash2 className="h-3 w-3" />
              }
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Column ───────────────────────────────────────────────── */

function Column({ col, apps }: { col: typeof COLUMNS[0]; apps: Application[] }) {
  return (
    <div className="flex flex-col min-w-0">
      <div className="flex items-center gap-2 mb-3">
        <span className={`h-2 w-2 rounded-full shrink-0 ${col.dot}`} />
        <h3 className="font-heading font-semibold text-sm text-foreground">{col.label}</h3>
        <span className={`ml-auto inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${col.badge}`}>
          {apps.length}
        </span>
      </div>
      <div className="space-y-3 flex-1">
        {apps.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <p className="text-xs text-muted-foreground">No applications here yet</p>
          </div>
        ) : (
          apps.map(app => <AppCard key={app.id} app={app} col={col} />)
        )}
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────── */

export default function TrackerPage() {
  const { applications, isLoading } = useApplications();
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<ApplicationStatus>("applied");

  const byStatus = (status: ApplicationStatus) => applications.filter(a => a.status === status);

  const stats = [
    { label: "Total",      value: applications.length,          icon: BriefcaseBusiness },
    { label: "Interviews", value: byStatus("interview").length, icon: CalendarDays },
    { label: "Offers",     value: byStatus("offered").length,   icon: CheckCircle2 },
    { label: "Win rate",   value: applications.length > 0 ? `${Math.round((byStatus("offered").length / applications.length) * 100)}%` : "—", icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Application Tracker — IT ContractHub"
        description="Track your IT contract applications. See what's applied, in interview, and offered — all in one place."
        canonical="/tracker"
        noIndex={true}
      />
      <Navbar />

      {/* Header */}
      <section className="border-b bg-surface-subtle">
        <div className="container py-6 md:py-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">Application Tracker</h1>
              <p className="mt-1 text-muted-foreground">Track every contract you apply to, from first contact to offer.</p>
            </div>
            <Button variant="hero" onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Application
            </Button>
          </div>

          {/* Stats */}
          {!isLoading && applications.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
              {stats.map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-xl border bg-card px-4 py-3 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="font-heading font-bold text-foreground text-lg leading-none mt-0.5">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="container py-6 flex-1">
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && applications.length === 0 && (
          <div className="text-center py-20 rounded-xl border bg-card max-w-sm mx-auto">
            <BriefcaseBusiness className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="font-heading font-semibold text-foreground">No applications yet</p>
            <p className="text-sm text-muted-foreground mt-1 mb-5">Start tracking roles you've applied to</p>
            <Button variant="hero" size="sm" onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add your first application
            </Button>
          </div>
        )}

        {!isLoading && applications.length > 0 && (
          <>
            {/* Mobile: tab switcher */}
            <div className="md:hidden mb-4">
              <div className="flex rounded-lg border overflow-x-auto scrollbar-none bg-background text-xs font-medium">
                {COLUMNS.map(col => (
                  <button
                    key={col.status}
                    onClick={() => setActiveTab(col.status)}
                    className={`flex-1 px-3 py-2 whitespace-nowrap flex items-center justify-center gap-1.5 border-r last:border-r-0 transition-colors ${
                      activeTab === col.status
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {col.label}
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      activeTab === col.status ? "bg-white/20 text-white" : col.badge
                    }`}>
                      {byStatus(col.status).length}
                    </span>
                  </button>
                ))}
              </div>
              <div className="mt-4">
                {COLUMNS.filter(c => c.status === activeTab).map(col => (
                  <Column key={col.status} col={col} apps={byStatus(col.status)} />
                ))}
              </div>
            </div>

            {/* Desktop: 3-column kanban, centred */}
            <div className="hidden md:grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
              {COLUMNS.map(col => (
                <Column key={col.status} col={col} apps={byStatus(col.status)} />
              ))}
            </div>
          </>
        )}
      </section>

      <Footer />

      {showModal && <AddModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
