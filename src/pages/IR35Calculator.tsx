import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Calculator, TrendingUp, Building2, Umbrella,
  Info, ChevronDown, ChevronUp, CheckCircle, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

/* ── 2025/26 Tax constants ──────────────────────────────────── */

const R = {
  pa: 12_570, basicLimit: 50_270, higherLimit: 125_140, paReduceFrom: 100_000,
  basicRate: 0.20, higherRate: 0.40, additionalRate: 0.45,
  niPrimary: 12_570, niUEL: 50_270, niLow: 0.08, niHigh: 0.02,
  niSecondary: 5_000, niEmployer: 0.15,
  corpSmall: 0.19, corpMain: 0.25, corpSmallCap: 50_000, corpMainCap: 250_000,
  divAllowance: 500, divBasic: 0.0875, divHigher: 0.3375, divAdditional: 0.3935,
  ltdSalary: 12_570,
};

function effectivePA(total: number) {
  if (total >= R.higherLimit) return 0;
  if (total <= R.paReduceFrom) return R.pa;
  return Math.max(0, R.pa - Math.floor((total - R.paReduceFrom) / 2));
}
function incomeTax(gross: number) {
  const pa = effectivePA(gross); const t = Math.max(0, gross - pa); let tax = 0;
  tax += Math.min(t, R.basicLimit - R.pa) * R.basicRate;
  tax += Math.max(0, Math.min(t - (R.basicLimit - pa), R.higherLimit - R.basicLimit)) * R.higherRate;
  tax += Math.max(0, t - (R.higherLimit - pa)) * R.additionalRate;
  return Math.round(tax);
}
function employeeNI(gross: number) {
  let ni = 0;
  if (gross > R.niPrimary) ni += (Math.min(gross, R.niUEL) - R.niPrimary) * R.niLow;
  if (gross > R.niUEL) ni += (gross - R.niUEL) * R.niHigh;
  return Math.round(ni);
}
function corpTax(profit: number) {
  if (profit <= 0) return 0;
  if (profit <= R.corpSmallCap) return Math.round(profit * R.corpSmall);
  if (profit >= R.corpMainCap) return Math.round(profit * R.corpMain);
  const main = profit * R.corpMain;
  const relief = ((R.corpMainCap - profit) / (R.corpMainCap - R.corpSmallCap)) * (R.corpMain - R.corpSmall) * profit;
  return Math.round(main - relief);
}
function dividendTax(salary: number, dividends: number) {
  if (dividends <= 0) return 0;
  const pa = effectivePA(salary + dividends);
  const paForDivs = Math.max(0, pa - Math.min(salary, pa));
  let taxable = Math.max(0, dividends - paForDivs - R.divAllowance);
  if (taxable <= 0) return 0;
  let tax = 0;
  const basicRemaining = Math.max(0, R.basicLimit - Math.max(salary, pa));
  const basic = Math.min(taxable, basicRemaining); tax += basic * R.divBasic; taxable -= basic;
  const higher = Math.min(taxable, R.higherLimit - R.basicLimit); tax += higher * R.divHigher; taxable -= higher;
  if (taxable > 0) tax += taxable * R.divAdditional;
  return Math.round(Math.max(0, tax));
}

/* ── Calculations ───────────────────────────────────────────── */

interface Inputs { dayRate: number; daysPerWeek: number; weeksPerYear: number; umbrellaFee: number; accountant: number; expenses: number }

function calcUmbrella(i: Inputs) {
  const gross = i.dayRate * i.daysPerWeek * i.weeksPerYear;
  const fee = i.umbrellaFee * 12;
  const erNI = Math.max(0, gross - R.niSecondary) * R.niEmployer;
  const eeGross = Math.max(0, gross - fee - erNI);
  const tax = incomeTax(eeGross);
  const eeNI = employeeNI(eeGross);
  const net = Math.max(0, eeGross - tax - eeNI);
  return {
    gross, net, monthly: net / 12,
    effectiveRate: gross > 0 ? Math.round((net / gross) * 100) : 0,
    rows: [
      { label: "Gross contract income",    amount: gross,   positive: true },
      { label: "Umbrella margin",          amount: fee },
      { label: "Employer NI (15%)",        amount: erNI },
      { label: "Employee gross",           amount: eeGross, subtotal: true },
      { label: "Income tax (PAYE)",        amount: tax },
      { label: "Employee NI (8% / 2%)",   amount: eeNI },
      { label: "Net take-home",            amount: net,     total: true },
    ],
  };
}

function calcLtd(i: Inputs) {
  const gross = i.dayRate * i.daysPerWeek * i.weeksPerYear;
  const accountant = i.accountant * 12;
  const expenses = i.expenses * 12;
  const salary = R.ltdSalary;
  const erNI = Math.max(0, salary - R.niSecondary) * R.niEmployer;
  const profit = Math.max(0, gross - salary - erNI - accountant - expenses);
  const ct = corpTax(profit);
  const dividends = Math.max(0, profit - ct);
  const divTax = dividendTax(salary, dividends);
  const net = Math.max(0, salary + dividends - divTax);
  // Show actual effective corp tax rate (19% / blended / 25%) in the label
  const ctRate = profit > 0 ? Math.round((ct / profit) * 100) : 19;
  const ctLabel = profit <= R.corpSmallCap
    ? "Corporation tax (19%)"
    : profit >= R.corpMainCap
      ? "Corporation tax (25%)"
      : `Corporation tax (${ctRate}% effective)`;
  return {
    gross, net, monthly: net / 12,
    effectiveRate: gross > 0 ? Math.round((net / gross) * 100) : 0,
    rows: [
      { label: "Gross contract income",   amount: gross,     positive: true },
      { label: "Director salary",         amount: salary },
      { label: "Employer NI on salary",   amount: erNI },
      { label: "Accountant fees",         amount: accountant },
      { label: "Business expenses",       amount: expenses },
      { label: ctLabel,                   amount: ct },
      { label: "Dividend tax",            amount: divTax },
      { label: "Net take-home",           amount: net,       total: true },
    ],
  };
}

/* ── Helpers ────────────────────────────────────────────────── */

const fmt = (n: number) => `£${Math.round(n).toLocaleString("en-GB")}`;

function NumInput({ label, hint, prefix, suffix, value, onChange, min = 0, max, step = 1 }: {
  label: string; hint?: string; prefix?: string; suffix?: string;
  value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
        {label}
        {hint && <span className="text-xs text-muted-foreground font-normal">({hint})</span>}
      </label>
      <div className="relative flex items-center">
        {prefix && <span className="absolute left-3 text-sm text-muted-foreground pointer-events-none select-none">{prefix}</span>}
        <input
          type="number" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          onFocus={e => e.target.select()}
          className={`w-full h-10 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring no-spinner ${prefix ? "pl-7" : "pl-3"} ${suffix ? "pr-10" : "pr-3"}`}
        />
        {suffix && <span className="absolute right-3 text-xs text-muted-foreground pointer-events-none select-none">{suffix}</span>}
      </div>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────── */

type Mode = "inside" | "outside";

export default function IR35Calculator() {
  const [dayRate,    setDayRate]    = useState(500);
  const [daysPerWeek,setDaysPerWeek]= useState(5);
  const [weeksPerYear,setWeeks]     = useState(46);
  const [umbrellaFee,setUmbrella]   = useState(100);
  const [accountant, setAccountant] = useState(150);
  const [expenses,   setExpenses]   = useState(200);
  const [mode,       setMode]       = useState<Mode>("outside");
  const [breakdown,  setBreakdown]  = useState(false);

  const inputs: Inputs = { dayRate, daysPerWeek, weeksPerYear, umbrellaFee, accountant, expenses };
  const umbrella = useMemo(() => calcUmbrella(inputs), [dayRate, daysPerWeek, weeksPerYear, umbrellaFee]);
  const ltd      = useMemo(() => calcLtd(inputs),      [dayRate, daysPerWeek, weeksPerYear, accountant, expenses]);

  const active = mode === "inside" ? umbrella : ltd;
  const other  = mode === "inside" ? ltd : umbrella;
  const diff   = ltd.net - umbrella.net;

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="IR35 Take-Home Calculator 2025/26 — IT ContractHub"
        description="Compare net take-home pay inside vs outside IR35. Includes income tax, NI, umbrella fees, corporation tax, and dividends for 2025/26."
        canonical="/ir35-calculator"
      />
      <Navbar />

      {/* Hero */}
      <section className="relative border-b bg-surface-subtle overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-[300px] w-[600px] rounded-full bg-primary/10 blur-[80px]" />
        </div>
        <div className="container relative py-10 md:py-14 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary mb-4">
            <Calculator className="h-3 w-3" /> 2025/26 Tax Year
          </div>
          <h1 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-3">IR35 Take-Home Calculator</h1>
          <p className="text-muted-foreground text-base max-w-xl mb-5">
            Enter your day rate and see exactly how much you take home — inside IR35 via umbrella, or outside IR35 through your Ltd company.
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {["Income tax & NI", "Corporation tax", "Dividend tax", "Umbrella fees"].map(t => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      <main className="container py-8 max-w-3xl flex-1">
        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8 items-start">

          {/* ── Inputs ──────────────────────────────────── */}
          <div className="rounded-2xl border bg-card p-6 md:sticky md:top-24 space-y-5">
            <h2 className="font-heading font-bold text-foreground text-sm uppercase tracking-wide">Your details</h2>

            <NumInput label="Day rate" prefix="£" value={dayRate} onChange={setDayRate} min={100} max={5000} step={50} />
            <div className="grid grid-cols-2 gap-3">
              <NumInput label="Days / week" suffix="days" value={daysPerWeek} onChange={setDaysPerWeek} min={1} max={7} />
              <NumInput label="Weeks / year" suffix="wks" value={weeksPerYear} onChange={setWeeks} min={1} max={52} />
            </div>

            {/* Toggle drives which extra inputs to show */}
            <div className="border-t pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Scenario</p>
              <div className="flex rounded-lg border overflow-hidden text-sm font-medium">
                {([["inside", "Inside IR35"], ["outside", "Outside IR35"]] as [Mode, string][]).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setMode(val)}
                    className={`flex-1 py-2 transition-colors ${mode === val ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {mode === "inside" ? (
              <NumInput label="Umbrella margin" prefix="£" suffix="/mo" value={umbrellaFee} onChange={setUmbrella} min={0} max={500} />
            ) : (
              <div className="space-y-3">
                <NumInput label="Accountant fees" prefix="£" suffix="/mo" value={accountant} onChange={setAccountant} min={0} max={500} />
                <NumInput label="Business expenses" prefix="£" suffix="/mo" value={expenses} onChange={setExpenses} min={0} max={2000} />
              </div>
            )}

            <div className="rounded-lg bg-muted/50 px-3 py-2.5 flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
              <span>{mode === "outside" ? `Ltd uses ${fmt(R.ltdSalary)} salary; remaining profit taken as dividends. Corp tax: 19% (≤£50k), 25% (>£250k), marginal relief in between.` : "Employer NI deducted before you receive gross pay."}</span>
            </div>
          </div>

          {/* ── Results ─────────────────────────────────── */}
          <div className="space-y-4">

            {/* Mode label */}
            <div className="flex items-center gap-2">
              <span className={`flex h-8 w-8 items-center justify-center rounded-xl shrink-0 ${mode === "inside" ? "bg-amber-500/10 text-amber-500" : "bg-primary/10 text-primary"}`}>
                {mode === "inside" ? <Umbrella className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
              </span>
              <div>
                <p className="font-heading font-bold text-foreground">{mode === "inside" ? "Inside IR35 — Umbrella" : "Outside IR35 — Ltd Company"}</p>
                <p className="text-xs text-muted-foreground">2025/26 tax year</p>
              </div>
              <span className={`ml-auto text-xs font-semibold px-2.5 py-1 rounded-full ${mode === "inside" ? "bg-amber-500/10 text-amber-500" : "bg-primary/10 text-primary"}`}>
                {active.effectiveRate}% take-home
              </span>
            </div>

            {/* Main net figure */}
            <div className="rounded-2xl border bg-card overflow-hidden">
              {mode === "outside" && <div className="h-1 w-full bg-gradient-to-r from-primary via-blue-400 to-primary bg-[length:200%_100%] animate-[shimmer_2s_linear_infinite]" />}
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="rounded-xl bg-muted/40 px-4 py-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Annual take-home</p>
                    <p className="text-3xl font-heading font-bold text-foreground">{fmt(active.net)}</p>
                  </div>
                  <div className="rounded-xl bg-muted/40 px-4 py-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Monthly take-home</p>
                    <p className="text-3xl font-heading font-bold text-foreground">{fmt(active.monthly)}</p>
                  </div>
                </div>

                {/* vs other scenario */}
                <div className={`rounded-xl px-4 py-3 flex items-center justify-between gap-3 ${diff > 0 ? (mode === "outside" ? "bg-green-500/10 border border-green-500/20" : "bg-muted/40") : (mode === "inside" ? "bg-green-500/10 border border-green-500/20" : "bg-muted/40")}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <TrendingUp className={`h-4 w-4 shrink-0 ${(mode === "outside" && diff > 0) || (mode === "inside" && diff < 0) ? "text-green-500" : "text-muted-foreground"}`} />
                    <span className="text-sm text-muted-foreground truncate">
                      vs {mode === "inside" ? "Outside IR35 (Ltd)" : "Inside IR35 (Umbrella)"}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-sm font-semibold ${(mode === "outside" && diff > 0) || (mode === "inside" && diff < 0) ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                      {(mode === "outside" && diff > 0) || (mode === "inside" && diff < 0) ? "+" : "−"}{fmt(Math.abs(diff))}/yr
                    </span>
                    <p className="text-xs text-muted-foreground">{fmt(Math.abs(diff / 12))}/mo</p>
                  </div>
                </div>

                {/* Breakdown toggle */}
                <button
                  onClick={() => setBreakdown(o => !o)}
                  className="w-full flex items-center justify-between mt-5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Full breakdown
                  {breakdown ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>

                {breakdown && (
                  <div className="mt-3 border-t pt-3 space-y-2">
                    {active.rows.map(row => (
                      <div
                        key={row.label}
                        className={`flex items-center justify-between gap-4 text-sm
                          ${row.total ? "border-t pt-2 font-semibold text-foreground" : ""}
                          ${row.subtotal ? "border-t border-dashed pt-2 text-foreground font-medium" : ""}
                          ${!row.total && !row.subtotal && !row.positive ? "text-muted-foreground" : ""}
                        `}
                      >
                        <span className="min-w-0">{row.label}</span>
                        <span className={`shrink-0 ${row.total ? "text-green-600 dark:text-green-400" : row.positive || row.subtotal ? "" : "text-destructive/80"}`}>
                          {row.positive || row.subtotal || row.total ? fmt(row.amount) : `−${fmt(row.amount)}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>


            {/* CTA */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-heading font-semibold text-foreground text-sm">Find contracts that state IR35 status</p>
                <p className="text-xs text-muted-foreground mt-0.5">Browse live roles filtered by Inside or Outside IR35.</p>
              </div>
              <Button variant="hero" size="sm" asChild>
                <Link to="/contracts">Browse Contracts <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
              </Button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong>Disclaimer:</strong> Estimates only. Based on 2025/26 UK tax rates with standard allowances and no other income sources. Not financial or tax advice — consult a qualified accountant.
            </p>
          </div>
        </div>
      </main>

      <Footer />

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .no-spinner::-webkit-outer-spin-button,
        .no-spinner::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .no-spinner { -moz-appearance: textfield; }
      `}</style>
    </div>
  );
}
