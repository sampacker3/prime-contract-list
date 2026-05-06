import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Calculator, TrendingUp, TrendingDown, Building2, Umbrella,
  Info, ChevronDown, ChevronUp, CheckCircle, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

/* ── 2025/26 Tax constants ──────────────────────────────────── */

const R = {
  // Income tax
  pa:              12_570,
  basicLimit:      50_270,
  higherLimit:    125_140,
  paReduceFrom:   100_000,
  basicRate:         0.20,
  higherRate:        0.40,
  additionalRate:    0.45,

  // Employee NI
  niPrimary:       12_570,
  niUEL:           50_270,
  niLow:             0.08,
  niHigh:            0.02,

  // Employer NI (April 2025 onwards)
  niSecondary:      5_000,
  niEmployer:        0.15,

  // Corporation tax
  corpSmall:         0.19,   // profits ≤ £50k
  corpMain:          0.25,   // profits ≥ £250k
  corpSmallCap:    50_000,
  corpMainCap:    250_000,

  // Dividends
  divAllowance:       500,
  divBasic:          0.0875,
  divHigher:         0.3375,
  divAdditional:     0.3935,

  // Ltd: optimal salary (≥ secondary threshold, below primary — no employee NI, no income tax)
  ltdSalary:       12_570,
};

/* ── Pure tax functions ─────────────────────────────────────── */

function effectivePA(totalIncome: number): number {
  if (totalIncome >= R.higherLimit) return 0;
  if (totalIncome <= R.paReduceFrom) return R.pa;
  return Math.max(0, R.pa - Math.floor((totalIncome - R.paReduceFrom) / 2));
}

function incomeTax(gross: number): number {
  const pa = effectivePA(gross);
  const taxable = Math.max(0, gross - pa);
  let tax = 0;
  tax += Math.min(taxable, R.basicLimit - R.pa) * R.basicRate;
  tax += Math.max(0, Math.min(taxable - (R.basicLimit - pa), R.higherLimit - R.basicLimit)) * R.higherRate;
  tax += Math.max(0, taxable - (R.higherLimit - pa)) * R.additionalRate;
  return Math.round(tax);
}

function employeeNI(gross: number): number {
  let ni = 0;
  if (gross > R.niPrimary) ni += (Math.min(gross, R.niUEL) - R.niPrimary) * R.niLow;
  if (gross > R.niUEL)     ni += (gross - R.niUEL) * R.niHigh;
  return Math.round(ni);
}

function corpTax(profit: number): number {
  if (profit <= 0) return 0;
  if (profit <= R.corpSmallCap) return Math.round(profit * R.corpSmall);
  if (profit >= R.corpMainCap)  return Math.round(profit * R.corpMain);
  const main = profit * R.corpMain;
  const relief = ((R.corpMainCap - profit) / (R.corpMainCap - R.corpSmallCap)) * (R.corpMain - R.corpSmall) * profit;
  return Math.round(main - relief);
}

function dividendTax(salary: number, dividends: number): number {
  if (dividends <= 0) return 0;
  const totalIncome = salary + dividends;
  const pa = effectivePA(totalIncome);
  const paUsedBySalary = Math.min(salary, pa);
  const paForDivs = Math.max(0, pa - paUsedBySalary);
  let taxable = Math.max(0, dividends - paForDivs - R.divAllowance);
  if (taxable <= 0) return 0;
  let tax = 0;
  const basicRemaining = Math.max(0, R.basicLimit - Math.max(salary, pa));
  const basic = Math.min(taxable, basicRemaining); tax += basic * R.divBasic; taxable -= basic;
  const higher = Math.min(taxable, R.higherLimit - R.basicLimit); tax += higher * R.divHigher; taxable -= higher;
  if (taxable > 0) tax += taxable * R.divAdditional;
  return Math.round(Math.max(0, tax));
}

/* ── Calculator logic ───────────────────────────────────────── */

interface Inputs {
  dayRate: number;
  daysPerWeek: number;
  weeksPerYear: number;
  umbrellaFeeMonthly: number;
  accountantMonthly: number;
  expensesMonthly: number;
}

interface ScenarioResult {
  grossAnnual: number;
  deductions: { label: string; amount: number; sub?: boolean }[];
  netAnnual: number;
  effectiveRate: number;
}

function calcUmbrella(i: Inputs): ScenarioResult {
  const grossAnnual = i.dayRate * i.daysPerWeek * i.weeksPerYear;
  const umbrellaFee = i.umbrellaFeeMonthly * 12;
  const empNI = Math.max(0, grossAnnual - R.niSecondary) * R.niEmployer;
  const employeeGross = Math.max(0, grossAnnual - umbrellaFee - empNI);
  const tax = incomeTax(employeeGross);
  const eeNI = employeeNI(employeeGross);
  const net = Math.max(0, employeeGross - tax - eeNI);
  return {
    grossAnnual,
    deductions: [
      { label: "Umbrella fee",           amount: umbrellaFee },
      { label: "Employer NI (15%)",      amount: empNI },
      { label: "Employee gross pay",     amount: employeeGross, sub: true },
      { label: "Income tax (PAYE)",      amount: tax },
      { label: "Employee NI (8%/2%)",    amount: eeNI },
    ],
    netAnnual: net,
    effectiveRate: grossAnnual > 0 ? Math.round((net / grossAnnual) * 100) : 0,
  };
}

function calcLtd(i: Inputs): ScenarioResult {
  const grossAnnual = i.dayRate * i.daysPerWeek * i.weeksPerYear;
  const accountant = i.accountantMonthly * 12;
  const expenses = i.expensesMonthly * 12;
  const salary = R.ltdSalary;
  const erNI = Math.max(0, salary - R.niSecondary) * R.niEmployer;
  const companyProfit = Math.max(0, grossAnnual - salary - erNI - accountant - expenses);
  const ct = corpTax(companyProfit);
  const dividends = Math.max(0, companyProfit - ct);
  const divTax = dividendTax(salary, dividends);
  const net = Math.max(0, salary + dividends - divTax);
  return {
    grossAnnual,
    deductions: [
      { label: "Director salary",        amount: salary },
      { label: "Employer NI on salary",  amount: erNI },
      { label: "Accountant fees",        amount: accountant },
      { label: "Business expenses",      amount: expenses },
      { label: "Corporation tax",        amount: ct },
      { label: "Dividend tax",           amount: divTax },
    ],
    netAnnual: net,
    effectiveRate: grossAnnual > 0 ? Math.round((net / grossAnnual) * 100) : 0,
  };
}

/* ── Formatting helpers ─────────────────────────────────────── */

const fmt = (n: number, decimals = 0) =>
  `£${Math.round(n).toLocaleString("en-GB", { minimumFractionDigits: decimals })}`;

/* ── Labelled input ─────────────────────────────────────────── */

function Field({ label, hint, prefix, suffix, value, onChange, min = 0, max, step = 1 }: {
  label: string; hint?: string; prefix?: string; suffix?: string;
  value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">{label}</label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-3 text-sm text-muted-foreground pointer-events-none">{prefix}</span>
        )}
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className={`w-full h-10 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring ${prefix ? "pl-7" : "pl-3"} ${suffix ? "pr-10" : "pr-3"}`}
        />
        {suffix && (
          <span className="absolute right-3 text-xs text-muted-foreground pointer-events-none">{suffix}</span>
        )}
      </div>
    </div>
  );
}

/* ── Result card ────────────────────────────────────────────── */

function ResultCard({ title, icon: Icon, colour, result, accent }: {
  title: string; icon: React.ElementType; colour: string;
  result: ScenarioResult; accent?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`rounded-2xl border ${accent ? "border-primary/50 shadow-lg shadow-primary/10" : "border-border"} bg-card overflow-hidden`}>
      {accent && <div className="h-1 w-full bg-gradient-to-r from-primary via-blue-400 to-primary bg-[length:200%_100%] animate-[shimmer_2s_linear_infinite]" />}
      <div className="p-6">
        <div className="flex items-center gap-2 mb-5">
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${colour}`}>
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <p className="font-heading font-bold text-foreground text-sm">{title}</p>
            <p className="text-xs text-muted-foreground">Tax year 2025/26</p>
          </div>
          <Badge variant="secondary" className="ml-auto text-xs">
            {result.effectiveRate}% take-home
          </Badge>
        </div>

        {/* Net take-home headline */}
        <div className="rounded-xl bg-muted/40 px-5 py-4 mb-5 text-center">
          <p className="text-xs text-muted-foreground mb-1">Annual net take-home</p>
          <p className="text-4xl font-heading font-bold text-foreground">{fmt(result.netAnnual)}</p>
          <p className="text-sm text-muted-foreground mt-1">{fmt(result.netAnnual / 12)} / month</p>
        </div>

        {/* Breakdown toggle */}
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          See full breakdown
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {open && (
          <div className="mt-3 space-y-2 border-t pt-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Gross annual income</span>
              <span className="font-medium text-foreground">{fmt(result.grossAnnual)}</span>
            </div>
            {result.deductions.map(d => (
              <div
                key={d.label}
                className={`flex justify-between text-sm ${d.sub ? "border-t border-dashed pt-2 mt-2 font-medium text-foreground" : "text-muted-foreground"}`}
              >
                <span className={d.sub ? "" : ""}>{d.label}</span>
                <span className={d.sub ? "" : "text-destructive/80"}>
                  {d.sub ? fmt(d.amount) : `−${fmt(d.amount)}`}
                </span>
              </div>
            ))}
            <div className="flex justify-between text-sm font-semibold text-foreground border-t pt-2 mt-2">
              <span>Net take-home</span>
              <span className="text-green-600 dark:text-green-400">{fmt(result.netAnnual)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────── */

export default function IR35Calculator() {
  const [dayRate,             setDayRate]             = useState(500);
  const [daysPerWeek,         setDaysPerWeek]         = useState(5);
  const [weeksPerYear,        setWeeksPerYear]        = useState(46);
  const [umbrellaFeeMonthly,  setUmbrellaFeeMonthly]  = useState(100);
  const [accountantMonthly,   setAccountantMonthly]   = useState(150);
  const [expensesMonthly,     setExpensesMonthly]     = useState(200);

  const inputs: Inputs = { dayRate, daysPerWeek, weeksPerYear, umbrellaFeeMonthly, accountantMonthly, expensesMonthly };

  const umbrella = useMemo(() => calcUmbrella(inputs), [dayRate, daysPerWeek, weeksPerYear, umbrellaFeeMonthly]);
  const ltd      = useMemo(() => calcLtd(inputs),      [dayRate, daysPerWeek, weeksPerYear, accountantMonthly, expensesMonthly]);

  const annualDiff  = ltd.netAnnual - umbrella.netAnnual;
  const monthlyDiff = annualDiff / 12;
  const betterOutside = annualDiff >= 0;

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="IR35 Take-Home Calculator 2025/26 — IT ContractHub"
        description="Compare your net take-home pay inside vs outside IR35. Calculate income tax, NI, umbrella fees, and Ltd company dividends for 2025/26."
        canonical="/ir35-calculator"
      />
      <Navbar />

      {/* ── Hero ──────────────────────────────────────── */}
      <section className="relative border-b bg-surface-subtle overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-[300px] w-[600px] rounded-full bg-primary/10 blur-[80px]" />
        </div>
        <div className="container relative py-10 md:py-14 max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary mb-4">
            <Calculator className="h-3 w-3" /> 2025/26 Tax Year
          </div>
          <h1 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-3">
            IR35 Take-Home Calculator
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mb-6">
            Enter your day rate and see exactly how much you take home inside IR35 (umbrella) versus outside IR35 (Ltd company) — including all taxes, NI, and fees.
          </p>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            {[
              "Income tax + NI calculated",
              "Corporation tax included",
              "Umbrella fees factored in",
              "Dividend tax modelled",
            ].map(t => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      <main className="container py-8 max-w-4xl flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-8 items-start">

          {/* ── Inputs ──────────────────────────────────── */}
          <div className="rounded-2xl border bg-card p-6 lg:sticky lg:top-24 space-y-5">
            <h2 className="font-heading font-bold text-foreground">Your details</h2>

            <Field label="Day rate" prefix="£" value={dayRate} onChange={setDayRate} min={100} max={5000} step={50} />

            <div className="grid grid-cols-2 gap-3">
              <Field label="Days / week" value={daysPerWeek} onChange={setDaysPerWeek} min={1} max={7} suffix="days" />
              <Field label="Weeks / year" hint="incl. holiday" value={weeksPerYear} onChange={setWeeksPerYear} min={1} max={52} suffix="wks" />
            </div>

            <div className="border-t pt-4 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Inside IR35 — Umbrella</p>
              <Field label="Umbrella margin" prefix="£" suffix="/mo" value={umbrellaFeeMonthly} onChange={setUmbrellaFeeMonthly} min={0} max={500} />
            </div>

            <div className="border-t pt-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Outside IR35 — Ltd Company</p>
              <Field label="Accountant fees" prefix="£" suffix="/mo" value={accountantMonthly} onChange={setAccountantMonthly} min={0} max={500} />
              <Field label="Business expenses" prefix="£" suffix="/mo" value={expensesMonthly} onChange={setExpensesMonthly} min={0} max={2000} />
            </div>

            <div className="rounded-lg bg-muted/50 px-3 py-2.5 flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
              <span>Ltd uses optimal salary of {fmt(R.ltdSalary)} with remaining profit taken as dividends.</span>
            </div>
          </div>

          {/* ── Results ─────────────────────────────────── */}
          <div className="space-y-5">

            {/* Savings banner */}
            <div className={`rounded-2xl border p-5 ${betterOutside ? "border-green-500/30 bg-green-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
              <div className="flex items-center gap-3 flex-wrap">
                {betterOutside
                  ? <TrendingUp className="h-6 w-6 text-green-500 shrink-0" />
                  : <TrendingDown className="h-6 w-6 text-amber-500 shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <p className="font-heading font-bold text-foreground text-lg">
                    {betterOutside
                      ? <>Outside IR35 puts <span className="text-green-600 dark:text-green-400">{fmt(Math.abs(annualDiff))}</span> more in your pocket per year</>
                      : <>Inside IR35 puts <span className="text-amber-500">{fmt(Math.abs(annualDiff))}</span> more per year at these figures</>
                    }
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    That's <strong>{fmt(Math.abs(monthlyDiff))}/month</strong> difference — or{" "}
                    <strong>{fmt(Math.abs(annualDiff / (dayRate * daysPerWeek)))}</strong> per week worked.
                  </p>
                </div>
              </div>
            </div>

            {/* Side-by-side result cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ResultCard
                title="Inside IR35 — Umbrella"
                icon={Umbrella}
                colour="bg-amber-500/10 text-amber-500"
                result={umbrella}
              />
              <ResultCard
                title="Outside IR35 — Ltd Co."
                icon={Building2}
                colour="bg-primary/10 text-primary"
                result={ltd}
                accent
              />
            </div>

            {/* Quick comparison table */}
            <div className="rounded-2xl border bg-card overflow-hidden">
              <div className="px-5 py-3 border-b bg-muted/30">
                <p className="font-heading font-semibold text-foreground text-sm">Quick comparison</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left px-5 py-2.5" />
                    <th className="text-right px-4 py-2.5">Inside IR35</th>
                    <th className="text-right px-5 py-2.5">Outside IR35</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    { label: "Gross annual",   inside: umbrella.grossAnnual,                    outside: ltd.grossAnnual },
                    { label: "Total deducted", inside: umbrella.grossAnnual - umbrella.netAnnual, outside: ltd.grossAnnual - ltd.netAnnual },
                    { label: "Net annual",     inside: umbrella.netAnnual,                       outside: ltd.netAnnual,   highlight: true },
                    { label: "Net monthly",    inside: umbrella.netAnnual / 12,                  outside: ltd.netAnnual / 12 },
                    { label: "Effective rate", inside: umbrella.effectiveRate,                   outside: ltd.effectiveRate, pct: true },
                  ].map(row => (
                    <tr key={row.label} className={row.highlight ? "bg-primary/5" : ""}>
                      <td className={`px-5 py-3 text-muted-foreground ${row.highlight ? "font-semibold text-foreground" : ""}`}>{row.label}</td>
                      <td className={`text-right px-4 py-3 ${row.highlight ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                        {row.pct ? `${row.inside}%` : fmt(row.inside)}
                      </td>
                      <td className={`text-right px-5 py-3 font-semibold ${row.highlight ? "text-green-600 dark:text-green-400 font-bold" : "text-foreground"}`}>
                        {row.pct ? `${row.outside}%` : fmt(row.outside)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* CTA */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-heading font-semibold text-foreground">Find contracts that specify IR35 status</p>
                <p className="text-sm text-muted-foreground mt-0.5">Browse live roles and filter by Inside or Outside IR35.</p>
              </div>
              <Button variant="hero" size="sm" asChild>
                <Link to="/contracts">Browse Contracts <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Link>
              </Button>
            </div>

            {/* Disclaimer */}
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong>Disclaimer:</strong> This calculator provides estimates based on 2025/26 UK tax rates and is for illustrative purposes only. It does not constitute financial or tax advice. Figures assume standard allowances with no other income sources, pension contributions, or student loan deductions. Consult a qualified accountant before making decisions.
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
      `}</style>
    </div>
  );
}
