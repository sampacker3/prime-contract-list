import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { TrendingUp, Briefcase, BarChart3, ArrowUpDown, ChevronUp, ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { supabase } from "@/lib/supabase";

/* ── Skill definitions ─────────────────────────────────────── */

const SKILLS: { name: string; category: string; keywords?: string[] }[] = [
  // Software Engineering
  { name: "Python",           category: "Software Engineering" },
  { name: "JavaScript",       category: "Software Engineering" },
  { name: "TypeScript",       category: "Software Engineering" },
  { name: "Java",             category: "Software Engineering" },
  { name: "C#",               category: "Software Engineering", keywords: ["c#", "csharp", "dotnet developer"] },
  { name: "C++",              category: "Software Engineering", keywords: ["c++", "cpp"] },
  { name: "Scala",            category: "Software Engineering" },
  { name: "Go",               category: "Software Engineering", keywords: ["golang", " go "] },
  { name: "Rust",             category: "Software Engineering" },
  { name: "Ruby",             category: "Software Engineering" },
  { name: "Swift",            category: "Software Engineering" },
  { name: "Kotlin",           category: "Software Engineering" },
  { name: "MATLAB",           category: "Software Engineering" },
  { name: "Perl",             category: "Software Engineering" },
  // Backend
  { name: "Node.js",          category: "Backend Development", keywords: ["node.js", "nodejs", "node js"] },
  { name: "Django",           category: "Backend Development" },
  { name: "FastAPI",          category: "Backend Development" },
  { name: "Spring Boot",      category: "Backend Development", keywords: ["spring boot", "spring"] },
  { name: "NestJS",           category: "Backend Development", keywords: ["nestjs", "nest.js"] },
  { name: ".NET",             category: "Backend Development", keywords: [".net", "dotnet", "asp.net"] },
  // Frontend
  { name: "React",            category: "Frontend Development" },
  { name: "Angular",          category: "Frontend Development" },
  { name: "Vue.js",           category: "Frontend Development", keywords: ["vue.js", "vuejs", "vue"] },
  { name: "Next.js",          category: "Frontend Development", keywords: ["next.js", "nextjs"] },
  // Data Science
  { name: "Machine Learning", category: "Data Science" },
  { name: "Data Engineering", category: "Data Science", keywords: ["data engineer", "data engineering"] },
  { name: "Apache Spark",     category: "Data Science", keywords: ["spark", "pyspark"] },
  { name: "Pandas",           category: "Data Science" },
  { name: "TensorFlow",       category: "Data Science" },
  { name: "PyTorch",          category: "Data Science" },
  { name: "Data Science",     category: "Data Science", keywords: ["data scientist", "data science"] },
  // Cloud / DevOps
  { name: "AWS",              category: "Cloud Engineering" },
  { name: "Azure",            category: "Cloud Engineering" },
  { name: "GCP",              category: "Cloud Engineering", keywords: ["gcp", "google cloud"] },
  { name: "Kubernetes",       category: "Cloud Engineering", keywords: ["kubernetes", "k8s"] },
  { name: "Docker",           category: "Cloud Engineering" },
  { name: "Terraform",        category: "Cloud Engineering" },
  { name: "DevOps",           category: "Cloud Engineering" },
  { name: "Cloud Engineering",category: "Cloud Engineering", keywords: ["cloud engineer", "cloud engineering"] },
  // Cyber Security
  { name: "Security Architect",    category: "Cyber Security", keywords: ["security architect"] },
  { name: "CISO",                  category: "Cyber Security" },
  { name: "DevSecOps",             category: "Cyber Security" },
  { name: "Penetration Testing",   category: "Cyber Security", keywords: ["pen test", "penetration test", "pentesting"] },
  { name: "SOC Analyst",           category: "Cyber Security", keywords: ["soc analyst", "soc engineer"] },
  // Project Management
  { name: "Programme Manager",     category: "Project Management", keywords: ["programme manager", "program manager"] },
  { name: "Project Manager",       category: "Project Management", keywords: ["project manager"] },
  { name: "Business Analyst",      category: "Project Management", keywords: ["business analyst"] },
  { name: "Enterprise Architect",  category: "Project Management", keywords: ["enterprise architect"] },
  { name: "Business Architect",    category: "Project Management", keywords: ["business architect"] },
  { name: "SAFe",                  category: "Project Management", keywords: ["safe agile", "safe scrum", "safe"] },
  { name: "Scrum Master",          category: "Project Management", keywords: ["scrum master"] },
  { name: "Agile Coach",           category: "Project Management", keywords: ["agile coach"] },
  // Finance / ERP
  { name: "Finance Director",      category: "Finance", keywords: ["finance director"] },
  { name: "Finance Transformation",category: "Finance", keywords: ["finance transformation"] },
  { name: "Finance Systems",       category: "Finance", keywords: ["finance systems"] },
  { name: "SAP",                   category: "Finance" },
  { name: "Oracle Finance",        category: "Finance", keywords: ["oracle finance", "oracle financials"] },
  // Data / BI
  { name: "SQL",                   category: "Data & BI" },
  { name: "Power BI",              category: "Data & BI", keywords: ["power bi", "powerbi"] },
  { name: "Tableau",               category: "Data & BI" },
  { name: "Snowflake",             category: "Data & BI" },
  { name: "Databricks",            category: "Data & BI" },
];

const CATEGORIES = ["All Categories", ...Array.from(new Set(SKILLS.map(s => s.category))).sort()];

type SortKey = "avg" | "min" | "max" | "count" | "name";

/* ── PayRate parser ────────────────────────────────────────── */

function parseRateRange(raw: string): { min: number; max: number } | null {
  if (!raw) return null;
  const s = raw.toLowerCase().replace(/,/g, "").replace(/\s+/g, " ");

  // Skip annual / salary
  if (/annum|annual|salary|per year|pa\b|p\.a/.test(s)) return null;

  // Detect hourly (convert at 7.5h/day)
  const isHourly = /per hour|\/hour|p\/h\b| ph\b|hourly/.test(s);

  // Extract numbers >= 50 (filter out things like "1 year", "5 days notice")
  const raw_nums = (s.match(/\d+(?:\.\d+)?/g) ?? []).map(Number).filter(n => n >= 50 && n <= 5000);
  if (raw_nums.length === 0) return null;

  let nums = raw_nums;
  if (isHourly) nums = nums.map(n => Math.round(n * 7.5));

  if (nums.length === 1) return { min: nums[0], max: nums[0] };
  return { min: Math.min(...nums), max: Math.max(...nums) };
}

/* ── Data hook ─────────────────────────────────────────────── */

interface SkillStat {
  name: string;
  category: string;
  avg: number;
  min: number;
  max: number;
  count: number;
}

function useSkillRates() {
  return useQuery<SkillStat[]>({
    queryKey: ["day-rates"],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 30);

      const { data, error } = await supabase
        .from("LinkedinScrapeResults")
        .select("JobTitle, PayRate")
        .gte("created_at", since.toISOString())
        .not("PayRate", "is", null)
        .not("PayRate", "eq", "");

      if (error) throw error;

      const contracts = (data ?? []) as { JobTitle: string | null; PayRate: string | null }[];

      const stats: SkillStat[] = [];

      for (const skill of SKILLS) {
        const kws = skill.keywords ?? [skill.name.toLowerCase()];
        const matches: number[] = [];

        for (const { JobTitle, PayRate } of contracts) {
          if (!JobTitle || !PayRate) continue;
          const title = JobTitle.toLowerCase();
          const matched = kws.some(kw => title.includes(kw.toLowerCase()));
          if (!matched) continue;

          const range = parseRateRange(PayRate);
          if (!range) continue;
          matches.push((range.min + range.max) / 2);
        }

        if (matches.length === 0) continue;

        const avg = Math.round(matches.reduce((a, b) => a + b, 0) / matches.length);
        const min = Math.round(Math.min(...matches));
        const max = Math.round(Math.max(...matches));

        stats.push({ name: skill.name, category: skill.category, avg, min, max, count: matches.length });
      }

      return stats.sort((a, b) => b.avg - a.avg);
    },
  });
}

/* ── Helpers ───────────────────────────────────────────────── */

function fmt(n: number) {
  return `£${n.toLocaleString("en-GB")}`;
}

function RateBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="font-heading font-bold text-foreground w-16 shrink-0">{fmt(value)}</span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[80px]">
        <div className="h-full bg-primary/60 rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ── Sortable header ───────────────────────────────────────── */

function SortHeader({ label, sortKey, current, onSort }: { label: string; sortKey: SortKey; current: { key: SortKey; dir: "asc" | "desc" }; onSort: (k: SortKey) => void }) {
  const active = current.key === sortKey;
  return (
    <button
      onClick={() => onSort(sortKey)}
      className={`flex items-center gap-1 text-xs font-medium uppercase tracking-wide transition-colors ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
    >
      {label}
      {active
        ? current.dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        : <ArrowUpDown className="h-3 w-3 opacity-40" />
      }
    </button>
  );
}

/* ── Category colour ───────────────────────────────────────── */

const CAT_COLOURS: Record<string, string> = {
  "Software Engineering":  "bg-blue-500/10 text-blue-500 border-blue-500/20",
  "Backend Development":   "bg-violet-500/10 text-violet-500 border-violet-500/20",
  "Frontend Development":  "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  "Data Science":          "bg-orange-500/10 text-orange-500 border-orange-500/20",
  "Cloud Engineering":     "bg-sky-500/10 text-sky-500 border-sky-500/20",
  "Cyber Security":        "bg-red-500/10 text-red-500 border-red-500/20",
  "Project Management":    "bg-amber-500/10 text-amber-500 border-amber-500/20",
  "Finance":               "bg-green-500/10 text-green-600 border-green-500/20",
  "Data & BI":             "bg-pink-500/10 text-pink-500 border-pink-500/20",
};

/* ── Page ──────────────────────────────────────────────────── */

export default function DayRatesPage() {
  const { data: skills = [], isLoading } = useSkillRates();
  const navigate = useNavigate();

  const [category, setCategory] = useState("All Categories");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "avg", dir: "desc" });
  const [search, setSearch] = useState("");

  const toggleSort = (key: SortKey) => {
    setSort(prev => prev.key === key ? { key, dir: prev.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" });
  };

  const maxAvg = useMemo(() => Math.max(...skills.map(s => s.avg), 1), [skills]);

  const filtered = useMemo(() => {
    let list = skills;
    if (category !== "All Categories") list = list.filter(s => s.category === category);
    if (search.trim()) list = list.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
    return [...list].sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      if (sort.key === "name") return dir * a.name.localeCompare(b.name);
      return dir * (a[sort.key] - b[sort.key]);
    });
  }, [skills, category, sort, search]);

  const totalContracts = useMemo(() => skills.reduce((sum, s) => sum + s.count, 0), [skills]);
  const overallAvg = useMemo(() => skills.length ? Math.round(skills.reduce((s, r) => s + r.avg, 0) / skills.length) : 0, [skills]);

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="IT Contract Day Rates by Skill — IT ContractHub"
        description="See average, min and max day rates for IT contract skills in the UK. Updated daily from live contract data."
        canonical="/day-rates"
      />
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative border-b bg-surface-subtle overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 right-0 h-[300px] w-[400px] rounded-full bg-primary/10 blur-[80px]" />
        </div>
        <div className="container relative py-10 md:py-14">
          <div className="inline-flex items-center gap-2 rounded-full border bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary mb-4">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
            </span>
            Live contract data
          </div>
          <h1 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-3">
            IT Contract Day Rates by Skill
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl">
            Real day rate data pulled from contracts posted in the last 30 days across 500+ sources. Use it to benchmark your rate or find the highest-paying skills to develop.
          </p>

          {/* Stats */}
          {!isLoading && skills.length > 0 && (
            <div className="flex flex-wrap gap-4 mt-8">
              {[
                { icon: BarChart3,   label: "Skills tracked",       value: skills.length },
                { icon: Briefcase,   label: "Contracts analysed",   value: totalContracts.toLocaleString("en-GB") },
                { icon: TrendingUp,  label: "Overall avg day rate", value: fmt(overallAvg) },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="font-heading font-bold text-foreground leading-none mt-0.5">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Filters ──────────────────────────────────────── */}
      <section className="border-b bg-background sticky top-16 z-30">
        <div className="container py-3 flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search skills…"
              className="w-full h-9 pl-8 pr-3 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Category */}
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="h-9 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>

          {filtered.length > 0 && (
            <span className="text-xs text-muted-foreground ml-auto">
              Showing <span className="font-semibold text-foreground">{filtered.length}</span> skill{filtered.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </section>

      {/* ── Table ────────────────────────────────────────── */}
      <section className="container py-6 flex-1">
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" style={{ opacity: 1 - i * 0.06 }} />
            ))}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No skills matched your filters.</p>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <>
            {/* Desktop table */}
            <div className="hidden md:block rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-5 py-3">
                      <SortHeader label="Skill" sortKey="name" current={sort} onSort={toggleSort} />
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Category</th>
                    <th className="text-left px-4 py-3">
                      <SortHeader label="Avg" sortKey="avg" current={sort} onSort={toggleSort} />
                    </th>
                    <th className="text-left px-4 py-3">
                      <SortHeader label="Min" sortKey="min" current={sort} onSort={toggleSort} />
                    </th>
                    <th className="text-left px-4 py-3">
                      <SortHeader label="Max" sortKey="max" current={sort} onSort={toggleSort} />
                    </th>
                    <th className="text-left px-4 py-3">
                      <SortHeader label="Jobs (30d)" sortKey="count" current={sort} onSort={toggleSort} />
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((s, i) => (
                    <tr key={s.name} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-5 shrink-0">{i + 1}</span>
                          <span className="font-heading font-semibold text-foreground">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${CAT_COLOURS[s.category] ?? "bg-muted text-muted-foreground border-border"}`}>
                          {s.category}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <RateBar value={s.avg} max={maxAvg} />
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">{fmt(s.min)}</td>
                      <td className="px-4 py-3.5 text-muted-foreground">{fmt(s.max)}</td>
                      <td className="px-4 py-3.5">
                        <span className="text-muted-foreground">{s.count} job{s.count !== 1 ? "s" : ""}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <Button
                          size="sm"
                          variant="hero"
                          className="h-7 text-xs px-3"
                          onClick={() => navigate(`/contracts?q=${encodeURIComponent(s.name)}`)}
                        >
                          View Jobs
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {filtered.map((s) => (
                <div key={s.name} className="rounded-xl border bg-card p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-heading font-semibold text-foreground">{s.name}</p>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium mt-1 ${CAT_COLOURS[s.category] ?? "bg-muted text-muted-foreground"}`}>
                        {s.category}
                      </span>
                    </div>
                    <Button size="sm" variant="hero" className="h-7 text-xs px-3 shrink-0"
                      onClick={() => navigate(`/contracts?q=${encodeURIComponent(s.name)}`)}>
                      View Jobs
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                    {[{ l: "Avg", v: s.avg }, { l: "Min", v: s.min }, { l: "Max", v: s.max }].map(({ l, v }) => (
                      <div key={l} className="rounded-lg bg-muted/50 px-2 py-2">
                        <p className="text-xs text-muted-foreground mb-0.5">{l}</p>
                        <p className="font-heading font-bold text-sm text-foreground">{fmt(v)}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-right">{s.count} job{s.count !== 1 ? "s" : ""} in last 30 days</p>
                </div>
              ))}
            </div>

            {/* Disclaimer */}
            <p className="text-xs text-muted-foreground mt-6 text-center">
              Day rates calculated from contract listings posted in the last 30 days. Data is indicative and based on advertised rates — actual pay may vary.
            </p>
          </>
        )}
      </section>

      <Footer />
    </div>
  );
}
