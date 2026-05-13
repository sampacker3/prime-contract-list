#!/usr/bin/env npx tsx
/**
 * LinkedIn Contract Scraper + Enricher (merged)
 *
 * For each search term in LinkedInScrapeList:
 *   1. Fetches 2 pages of LinkedIn contract search results (UK, last 24h)
 *   2. Filters out jobs already in LinkedinScrapeResults
 *   3. For each new job: fetches full detail page, parses HTML, fires a single
 *      OpenAI call (overlapping with the jitter delay), saves to LinkedinScrapeResults
 *
 * Required env vars:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   OPENAI_API_KEY
 *
 * Optional:
 *   MIN_DELAY_MS   (default 1500) — min ms between LinkedIn detail fetches
 *   MAX_DELAY_MS   (default 3000) — max ms between LinkedIn detail fetches
 *   DRY_RUN        (default false) — parse + enrich but skip Supabase writes
 */

import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { Resend } from "resend";

// ── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const HUNTER_API_KEY = process.env.HUNTER_API_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const MIN_DELAY = Number(process.env.MIN_DELAY_MS ?? 1500);
const MAX_DELAY = Number(process.env.MAX_DELAY_MS ?? 3000);
const DRY_RUN = process.env.DRY_RUN === "true";
const LIMIT = process.env.LIMIT ? Number(process.env.LIMIT) : undefined;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY");
  process.exit(1);
}
if (!HUNTER_API_KEY) {
  console.warn("No HUNTER_API_KEY set — poster email lookup will be skipped");
}
if (!RESEND_API_KEY) {
  console.warn("No RESEND_API_KEY set — contract alert emails will be skipped");
}

const SEARCH_CONFIG = {
  jobType: "C",            // Contract only
  location: "United Kingdom",
  postedWithin: "r86400",  // Last 24 hours
  pagesPerTerm: 2,         // 2 pages = up to 20 results per search term
};

const DELAY_BETWEEN_TERMS_MS = 6000;

// ── Clients ───────────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

// ── Types ─────────────────────────────────────────────────────────────────────

interface AlertRow {
  id: number;
  user_id: string;
  keywords: string;
  match_count: number;
}

interface JobCard {
  postingDate: string;   // UK local date (YYYY-MM-DD)
  jobTitle: string;
  url: string;
  company: string;
  location: string;
  jobId: string;
  detailUrl: string;
}

interface JobDetail extends JobCard {
  companyUrl: string;
  posterName: string;
  postedText: string;
  salaryRaw: string;
  description: string;
  descriptionHtml: string;
  seniorityLevel: string;
  employmentType: string;
  jobFunction: string;
  industries: string[];
}

interface Enrichment {
  summary: string;
  ir35Status: string;
  workingType: string;
  payRate: string | null;
  contractDuration: string | null;
  isContract: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const jitter = (min: number, max: number) =>
  min + Math.floor(Math.random() * (max - min));

const ukDateToday = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });

function cleanHtml(s: string | undefined): string {
  return (s ?? "")
    .replace(/<[^>]+>/g, "")
    // Named HTML entities
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    // Numeric decimal entities (e.g. &#8212; → —)
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    // Numeric hex entities (e.g. &#x2014; → —)
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    // Fix common UTF-8 mojibake (em dash, smart quotes, bullet, £)
    .replace(/â€"/g, "—")
    .replace(/â€™/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€/g, '"')
    .replace(/â€¢/g, "•")
    .replace(/Â£/g, "£")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchPage(url: string, attempt = 1): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "Accept-Language": "en-GB,en;q=0.9",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        Referer: "https://www.linkedin.com/jobs/search/",
      },
    });

    if (res.status === 429) {
      const retryAfter = res.headers.get("Retry-After");
      const waitMs = retryAfter
        ? Number(retryAfter) * 1000
        : Math.min(5000 * attempt, 30_000);
      console.warn(`  LinkedIn rate limited — waiting ${waitMs / 1000}s (attempt ${attempt})`);
      await sleep(waitMs);
      if (attempt >= 4) throw new Error("Rate limit: max retries reached");
      return fetchPage(url, attempt + 1);
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  } catch (err) {
    if (attempt >= 3) throw err;
    await sleep(2000 * attempt);
    return fetchPage(url, attempt + 1);
  }
}

// ── Phase 1: Search ───────────────────────────────────────────────────────────

function buildSearchUrls(searchTerm: string): string[] {
  const base =
    "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search";
  const kw = encodeURIComponent(searchTerm);
  const loc = encodeURIComponent(SEARCH_CONFIG.location);
  const filters = `&f_JT=${SEARCH_CONFIG.jobType}&f_TPR=${SEARCH_CONFIG.postedWithin}`;
  const today = ukDateToday();

  return Array.from({ length: SEARCH_CONFIG.pagesPerTerm }, (_, i) =>
    `${base}?keywords=${kw}&location=${loc}&start=${i * 10}&count=10${filters}`
  );
}

function parseSearchResults(html: string): JobCard[] {
  const today = ukDateToday();
  const out: JobCard[] = [];

  for (const [, card] of html.matchAll(/<li>([\s\S]*?)<\/li>/g)) {
    if (!card.includes("jobPosting")) continue;

    const idM = card.match(/jobPosting:(\d+)/);
    const urlM = card.match(
      /href="(https:\/\/[a-z]+\.linkedin\.com\/jobs\/view\/[^?"]+)/
    );
    const titleM = card.match(/base-search-card__title[^>]*>([\s\S]*?)<\/h3>/);
    const coM = card.match(/base-search-card__subtitle[\s\S]*?>([\s\S]*?)<\/a>/);
    const locM = card.match(/job-search-card__location[^>]*>([\s\S]*?)<\/span>/);

    if (!idM || !urlM) continue;

    out.push({
      postingDate: today,
      jobTitle: titleM ? cleanHtml(titleM[1]) : "",
      url: urlM[1],
      company: coM ? cleanHtml(coM[1]) : "",
      location: locM ? cleanHtml(locM[1]) : "",
      jobId: idM[1],
      detailUrl: `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${idM[1]}`,
    });
  }

  const seen = new Set<string>();
  return out.filter((j) => {
    if (seen.has(j.jobId)) return false;
    seen.add(j.jobId);
    return true;
  });
}

// ── Phase 2: Detail parsing ───────────────────────────────────────────────────

function parseJobDetail(html: string, card: JobCard): JobDetail {
  const m = (pattern: RegExp) => cleanHtml((html.match(pattern) ?? [])[1]);

  const descHtml =
    (html.match(/description__text--rich([\s\S]*?)<\/section>/) ?? [])[1] ?? "";

  const crit = (label: string) =>
    cleanHtml(
      (html.match(
        new RegExp(
          `${label}[\\s\\S]*?description__job-criteria-text[^>]*>([\\s\\S]*?)<\\/span>`
        )
      ) ?? [])[1]
    );

  // Poster name — LinkedIn's "Meet the hiring team" section
  const posterName =
    m(/message-the-recruiter[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/) ||
    m(/hirer-card__hirer-information[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/) ||
    "";

  const industriesRaw = crit("Industries");

  return {
    ...card,
    companyUrl:
      (html.match(/topcard__org-name-link[^>]*href="([^"]+)"/) ?? [])[1] ?? "",
    posterName,
    postedText: m(/posted-time-ago__text[^>]*>([\s\S]*?)<\/span>/),
    salaryRaw: m(/compensation__salary[^>]*>([\s\S]*?)<\/div>/),
    description: cleanHtml(descHtml),
    descriptionHtml: descHtml,
    seniorityLevel: crit("Seniority level"),
    employmentType: crit("Employment type"),
    jobFunction: crit("Job function"),
    industries: industriesRaw ? industriesRaw.split(",").map((s) => s.trim()) : [],
    // Override with parsed title/company/location if available
    jobTitle: m(/top-card-layout__title[^>]*>([\s\S]*?)<\/h2>/) || card.jobTitle,
    company:
      m(/topcard__org-name-link[^>]*>([\s\S]*?)<\/a>/) || card.company,
    location:
      m(/topcard__flavor--bullet[^>]*>([\s\S]*?)<\/span>/) || card.location,
  };
}

// ── Phase 3: AI enrichment ────────────────────────────────────────────────────

// Employment types that are definitively not contract roles
const PERMANENT_EMPLOYMENT_TYPES = new Set([
  "full-time", "part-time", "internship", "volunteer",
]);

function isPermanentByEmploymentType(employmentType: string): boolean {
  return PERMANENT_EMPLOYMENT_TYPES.has(employmentType.toLowerCase().trim());
}

async function enrichWithOpenAI(job: JobDetail): Promise<Enrichment> {
  const prompt = `You are analysing a UK job posting scraped from LinkedIn.

Return ONLY valid JSON with these exact keys:

{
  "isContract": true if this is a contract/freelance/interim role, false if it is a permanent or fixed-term employee role,
  "summary": "2-3 sentence summary of the role and key skills required. Do not mention the company name.",
  "ir35Status": "Inside IR35" | "Outside IR35" | "Unknown",
  "workingType": "Remote" | "Hybrid" | "Onsite" | "Unknown",
  "payRate": "extracted pay rate string (e.g. £500-£600/day), or null if not mentioned",
  "contractDuration": "extracted contract duration (e.g. 6 months, 12 months, ongoing), or null if not mentioned"
}

Clues that it is a contract role: mentions of day rate, IR35, inside/outside IR35, Ltd company, umbrella, contract duration in months, "contract", "interim", "freelance".
Clues that it is permanent: mentions of salary, annual pay, benefits package, pension, holiday allowance, "permanent", "perm", "FTE".

Job title: ${job.jobTitle}
Employment type (from LinkedIn): ${job.employmentType || "not specified"}
Job description:
${job.description}

Salary info: ${job.salaryRaw || "not provided"}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: prompt }],
    temperature: 0,
  });

  try {
    const parsed = JSON.parse(response.choices[0]?.message?.content ?? "{}");
    return {
      isContract: parsed.isContract !== false, // default true if unclear
      summary: parsed.summary ?? "",
      ir35Status: parsed.ir35Status ?? "Unknown",
      workingType: parsed.workingType ?? "Unknown",
      payRate: parsed.payRate ?? null,
      contractDuration: parsed.contractDuration ?? null,
    };
  } catch {
    return {
      isContract: true, // don't drop jobs on parse error
      summary: "",
      ir35Status: "Unknown",
      workingType: "Unknown",
      payRate: null,
      contractDuration: null,
    };
  }
}

// ── Email lookup (slug → GPT domain → Verify × 2 → Finder fallback) ──────────

function parseLinkedInSlug(linkedInUrl: string): string {
  // Extract slug from e.g. https://www.linkedin.com/company/we-are-station/
  const match = linkedInUrl.match(/\/company\/([^/?#]+)/);
  return match ? match[1].toLowerCase() : "";
}

function domainCandidatesFromSlug(slug: string): string[] {
  if (!slug) return [];
  const base = slug.replace(/-/g, ""); // we-are-station → wearestation
  return [`${base}.com`, `${base}.co.uk`, `${slug}.com`, `${slug}.co.uk`];
}

// Normalise a name part for use in an email address:
// removes apostrophes, hyphens, accents → plain ascii lowercase
function normaliseNameForEmail(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove accents
    .replace(/[^a-z0-9]/g, "");      // remove apostrophes, hyphens, spaces etc.
}

// Score how well a Clearbit company name matches our input (0–1)
function clearbitNameScore(candidate: string, input: string): number {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, " ").trim();
  const words = norm(input).split(/\s+/).filter(Boolean);
  const candNorm = norm(candidate);
  if (!words.length) return 0;
  const hits = words.filter((w) => candNorm.includes(w)).length;
  return hits / words.length;
}

async function resolveCompanyDomain(
  company: string,
  linkedInUrl: string
): Promise<string | null> {
  const slug = parseLinkedInSlug(linkedInUrl);
  const slugCandidates = domainCandidatesFromSlug(slug);

  // ── Step 1: Clearbit autocomplete (free, no auth) ──────────────────────────
  try {
    const res = await fetch(
      `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(company)}`,
      { headers: { Accept: "application/json" } }
    );
    if (res.ok) {
      const results = await res.json() as Array<{ name: string; domain: string }>;
      // Find best-matching result (score ≥ 0.5 = at least half the words match)
      let best: { name: string; domain: string } | null = null;
      let bestScore = 0;
      for (const r of results.slice(0, 5)) {
        const score = clearbitNameScore(r.name, company);
        if (score > bestScore) { bestScore = score; best = r; }
      }
      if (best && bestScore > 0.5 && best.domain) {
        console.log(`  Domain (Clearbit): ${best.domain} [${best.name}, score=${bestScore.toFixed(2)}]`);
        return best.domain;
      }
    }
  } catch {
    // ignore — fall through to GPT
  }

  // ── Step 2: GPT web search — browses the LinkedIn company page ────────────
  // Only called when Clearbit has no confident match (~$0.03/call)
  if (linkedInUrl) {
    try {
      const response = await openai.responses.create({
        model: "gpt-4o-mini",
        tools: [{ type: "web_search_preview" }],
        input: `Browse this LinkedIn company page and find the company's external website URL (the "Visit website" link on their profile): ${linkedInUrl}

Company name for reference: ${company}

Return ONLY a JSON object with a single key: { "domain": "example.com" }
Return { "domain": null } if you cannot find a website URL.
Do not include http:// or https:// — just the bare domain (e.g. "wearestation.com").`,
      });

      // Extract text from the response output blocks
      const text = response.output
        .filter((b: { type: string }) => b.type === "message")
        .flatMap((b: { content: Array<{ type: string; text: string }> }) => b.content)
        .filter((c: { type: string }) => c.type === "output_text")
        .map((c: { text: string }) => c.text)
        .join("");

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.domain && parsed.domain !== "null") {
          console.log(`  Domain (GPT web search): ${parsed.domain}`);
          return parsed.domain;
        }
      }
    } catch (err) {
      console.warn(`  GPT web search failed: ${(err as Error).message}`);
    }
  }

  // ── Step 3: slug-derived fallback ─────────────────────────────────────────
  return slugCandidates[0] ?? null;
}

async function hunterVerifyEmail(email: string): Promise<string> {
  const res = await fetch(
    `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${HUNTER_API_KEY}`
  );
  const data = await res.json() as { data?: { result?: string } };
  return data.data?.result ?? "unknown";
}

async function hunterFindEmail(
  domain: string,
  firstName: string,
  lastName: string
): Promise<{ email: string; score: number } | null> {
  const res = await fetch(
    `https://api.hunter.io/v2/email-finder?domain=${encodeURIComponent(domain)}&first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}&api_key=${HUNTER_API_KEY}`
  );
  const data = await res.json() as { data?: { email?: string; score?: number } };
  const email = data.data?.email ?? null;
  const score = data.data?.score ?? 0;
  return email ? { email, score } : null;
}

async function findPosterEmail(
  posterName: string,
  company: string,
  companyLinkedInUrl: string
): Promise<string | null> {
  if (!HUNTER_API_KEY || !posterName.trim() || !company.trim()) return null;

  const nameParts = posterName.trim().split(/\s+/);
  if (nameParts.length < 2) return null;

  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(" ");
  const firstNorm = normaliseNameForEmail(firstName);   // e.g. "Luke"   → "luke"
  const lastNorm  = normaliseNameForEmail(lastName);    // e.g. "O'Neill" → "oneill"
  const initial   = firstNorm[0];

  try {
    // Step 1: resolve domain from LinkedIn slug + GPT (free)
    const domain = await resolveCompanyDomain(company, companyLinkedInUrl);
    if (!domain) {
      console.log(`  Email lookup: couldn't resolve domain for "${company}"`);
      return null;
    }
    console.log(`  Email lookup: domain → ${domain}`);

    // Derive both TLD variants regardless of which GPT returned
    const base = domain.replace(/\.(com|co\.uk)$/, "");
    const comDomain   = `${base}.com`;
    const coukDomain  = `${base}.co.uk`;

    // Step 2: verify patterns in priority order (0.5x each, stop on first deliverable)
    const patterns = [
      `${firstNorm}.${lastNorm}@${comDomain}`,
      `${firstNorm}.${lastNorm}@${coukDomain}`,
      `${initial}.${lastNorm}@${comDomain}`,
      `${initial}.${lastNorm}@${coukDomain}`,
      `${firstNorm}@${comDomain}`,
      `${firstNorm}@${coukDomain}`,
    ];

    for (const email of patterns) {
      const result = await hunterVerifyEmail(email);
      console.log(`  Hunter verify: ${email} → ${result}`);
      if (result === "deliverable") return email;
    }

    // Step 3: Hunter Finder as last resort (1x)
    console.log(`  Hunter finder: searching ${firstName} ${lastName} @ ${domain}…`);
    const found = await hunterFindEmail(domain, firstName, lastName);
    if (found && found.score >= 80) {
      console.log(`  Hunter finder: ${found.email} (confidence: ${found.score})`);
      return found.email;
    } else if (found) {
      console.log(`  Hunter finder: ${found.email} confidence too low (${found.score} < 80) — skipping`);
    } else {
      console.log(`  Hunter finder: no email found`);
    }

    return null;
  } catch (err) {
    console.warn(`  Email lookup failed: ${(err as Error).message}`);
    return null;
  }
}

// ── Alert matching ────────────────────────────────────────────────────────────

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function alertMatchesJob(keyword: string, job: JobDetail): boolean {
  const searchText = `${job.jobTitle} ${job.description}`.toLowerCase();
  const kw = keyword.toLowerCase().trim();
  if (!kw) return false;
  // Word-boundary match for short keywords (≤3 chars, e.g. "C", "JS")
  // to avoid "C" matching "Contract", "Cloud" etc.
  if (kw.length <= 3) {
    return new RegExp(`\\b${escapeRegex(kw)}\\b`, "i").test(searchText);
  }
  return searchText.includes(kw);
}

function buildAlertEmailHtml(
  keyword: string,
  job: JobDetail,
  enrichment: Enrichment
): string {
  const badges = [
    enrichment.ir35Status !== "Unknown" ? enrichment.ir35Status : null,
    enrichment.workingType !== "Unknown" ? enrichment.workingType : null,
    enrichment.payRate,
    enrichment.contractDuration,
  ]
    .filter(Boolean)
    .map(
      (b) =>
        `<span style="display:inline-block;background:#eff6ff;color:#1d4ed8;font-size:12px;font-weight:600;padding:3px 10px;border-radius:20px;margin:0 4px 4px 0;">${b}</span>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>New contract match: ${keyword}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Inter',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:560px;" cellpadding="0" cellspacing="0">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <span style="font-size:22px;font-weight:700;color:#1d4ed8;letter-spacing:-0.5px;">IT Contract<span style="color:#0f172a;">Hub</span></span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:12px;padding:40px 40px 32px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">

              <!-- Icon -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <div style="width:48px;height:48px;background:#eff6ff;border-radius:12px;display:inline-block;line-height:48px;text-align:center;font-size:24px;">🔔</div>
                  </td>
                </tr>
              </table>

              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;text-align:center;">New contract match</h1>
              <p style="margin:0 0 28px;font-size:15px;color:#64748b;text-align:center;line-height:1.6;">
                A new contract matching your alert for <strong style="color:#1d4ed8;">${keyword}</strong> has just been posted.
              </p>

              <!-- Contract card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:8px;background:#f8fafc;padding:0;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 4px;font-size:17px;font-weight:700;color:#0f172a;">${job.jobTitle}</p>
                    <p style="margin:0 0 12px;font-size:14px;color:#64748b;">${job.company} &middot; ${job.location}</p>
                    ${badges ? `<div style="margin-bottom:${enrichment.summary ? "12px" : "0"};">${badges}</div>` : ""}
                    ${enrichment.summary ? `<p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">${enrichment.summary}</p>` : ""}
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:28px;">
                    <a href="${job.url}"
                       style="display:inline-block;background:#1d4ed8;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:13px 32px;border-radius:8px;letter-spacing:0.1px;">
                      View contract &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#94a3b8;text-align:center;">
                You're receiving this because you have an alert set up for <strong>${keyword}</strong>.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 0 0;text-align:center;">
              <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;">
                <a href="https://itcontracthub.co.uk/alerts" style="color:#94a3b8;text-decoration:underline;">Manage alerts</a>
                &nbsp;&middot;&nbsp;
                <a href="https://itcontracthub.co.uk" style="color:#94a3b8;text-decoration:none;">itcontracthub.co.uk</a>
              </p>
              <p style="margin:4px 0 0;font-size:12px;color:#94a3b8;">&copy; 2025 IT ContractHub</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function dispatchContractAlerts(
  job: JobDetail,
  enrichment: Enrichment,
  alerts: AlertRow[],
  proUsers: Map<string, string> // user_id → email
): Promise<void> {
  if (!resend || !alerts.length) return;

  const matching = alerts.filter((a) => alertMatchesJob(a.keywords, job));
  if (!matching.length) return;

  for (const alert of matching) {
    const email = proUsers.get(alert.user_id);
    if (!email) continue;

    try {
      await resend.emails.send({
        from: "IT ContractHub <alerts@itcontracthub.co.uk>",
        to: [email],
        subject: `New contract match: ${alert.keywords}`,
        html: buildAlertEmailHtml(alert.keywords, job, enrichment),
      });
      console.log(`  📧 Alert sent to ${email} for "${alert.keywords}"`);

      // Increment match_count in DB and in memory
      await supabase
        .from("alerts")
        .update({ match_count: alert.match_count + 1 })
        .eq("id", alert.id);
      alert.match_count++;
    } catch (err) {
      console.warn(`  Alert email failed: ${(err as Error).message}`);
    }
  }
}

// ── Save ──────────────────────────────────────────────────────────────────────

async function saveJob(
  detail: JobDetail,
  enrichment: Enrichment,
  posterEmail: string | null
): Promise<void> {
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would save: ${detail.jobTitle}${posterEmail ? ` | email: ${posterEmail}` : ""}`);
    return;
  }

  const { error } = await supabase.from("LinkedinScrapeResults").insert({
    PostedDate: detail.postingDate,
    JobTitle: detail.jobTitle,
    URL: detail.url,
    Company: detail.company,
    Location: detail.location,
    EmploymentType: detail.employmentType,
    PostedText: detail.postedText,
    LinkedInJobID: detail.jobId,
    Description: enrichment.summary,
    PayRate: enrichment.payRate,
    IR35Status: enrichment.ir35Status,
    WorkType: enrichment.workingType,
    ContractDuration: enrichment.contractDuration,
    PosterName: detail.posterName,
    PosterEmail: posterEmail,
    CompanyLinkedInURL: detail.companyUrl,
  });

  if (error) throw new Error(error.message);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Starting LinkedIn contract scraper${DRY_RUN ? " [DRY RUN]" : ""}…\n`);

  // Load existing job IDs to avoid duplicates
  const { data: existingRows, error: existingErr } = await supabase
    .from("LinkedinScrapeResults")
    .select("LinkedInJobID");

  if (existingErr) {
    console.error("Failed to fetch existing IDs:", existingErr.message);
    process.exit(1);
  }

  const seenIds = new Set(
    (existingRows ?? [])
      .map((r: { LinkedInJobID: string }) => String(r.LinkedInJobID ?? ""))
      .filter(Boolean)
  );
  console.log(`Loaded ${seenIds.size} existing job IDs`);

  // Load search terms
  const { data: termRows, error: termsErr } = await supabase
    .from("LinkedInScrapeList")
    .select("SearchTerm");

  if (termsErr) {
    console.error("Failed to fetch search terms:", termsErr.message);
    process.exit(1);
  }

  const searchTerms: string[] = (termRows ?? [])
    .map((r: { SearchTerm: string }) => r.SearchTerm)
    .filter(Boolean);

  console.log(`Found ${searchTerms.length} search terms: ${searchTerms.join(", ")}\n`);

  // Load enabled alerts + pro user emails (once, reused for every job saved)
  const alerts: AlertRow[] = [];
  const proUsers = new Map<string, string>(); // user_id → email

  if (resend) {
    const { data: alertRows } = await supabase
      .from("alerts")
      .select("id, user_id, keywords, match_count")
      .eq("enabled", true);

    if (alertRows?.length) {
      alerts.push(...(alertRows as AlertRow[]));

      // Get unique user IDs from alerts, then filter to pro subscribers only
      const userIds = [...new Set(alerts.map((a) => a.user_id))];
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id, subscription_active")
        .in("id", userIds)
        .eq("subscription_active", true);

      const proUserIds = new Set((profileRows ?? []).map((p: { id: string }) => p.id));

      // Fetch email for each pro user via auth admin API
      for (const userId of proUserIds) {
        const { data } = await supabase.auth.admin.getUserById(userId);
        if (data?.user?.email) proUsers.set(userId, data.user.email);
      }

      console.log(`Loaded ${alerts.length} alerts for ${proUsers.size} pro user(s)\n`);
    }
  }

  // Collect all new job cards across all search terms first
  const allNewJobs: JobCard[] = [];

  for (let t = 0; t < searchTerms.length; t++) {
    const term = searchTerms[t];
    if (t > 0) await sleep(DELAY_BETWEEN_TERMS_MS);

    console.log(`Searching: "${term}"`);
    const urls = buildSearchUrls(term);

    for (let p = 0; p < urls.length; p++) {
      if (p > 0) await sleep(jitter(MIN_DELAY, MAX_DELAY));
      try {
        const html = await fetchPage(urls[p]);
        const cards = parseSearchResults(html);
        const newCards = cards.filter((c) => !seenIds.has(c.jobId));
        newCards.forEach((c) => seenIds.add(c.jobId)); // prevent cross-term dupes
        allNewJobs.push(...newCards);
        console.log(`  Page ${p + 1}: ${cards.length} found, ${newCards.length} new`);
      } catch (err) {
        console.warn(`  Page ${p + 1} failed: ${(err as Error).message}`);
      }
    }
  }

  if (LIMIT) allNewJobs.splice(LIMIT);
  console.log(`\nTotal new jobs to enrich: ${allNewJobs.length}\n`);

  if (allNewJobs.length === 0) {
    console.log("Nothing new today.");
    return;
  }

  // Fetch details + enrich with pipelined OpenAI calls
  let processed = 0;
  let failed = 0;

  let openAiPromise: Promise<Enrichment> | null = null;
  let pendingDetail: JobDetail | null = null;

  for (let i = 0; i < allNewJobs.length; i++) {
    const card = allNewJobs[i];
    console.log(`[${i + 1}/${allNewJobs.length}] ${card.jobTitle || card.jobId}`);

    // Save previous job's enrichment (was running during our sleep)
    if (openAiPromise && pendingDetail) {
      try {
        const enrichment = await openAiPromise;
        if (!enrichment.isContract) {
          console.log(`  ✗ Skipped "${pendingDetail.jobTitle}" — AI classified as permanent`);
        } else {
          const posterEmail = await findPosterEmail(pendingDetail.posterName, pendingDetail.company, pendingDetail.companyUrl);
          await saveJob(pendingDetail, enrichment, posterEmail);
          await dispatchContractAlerts(pendingDetail, enrichment, alerts, proUsers);
          processed++;
          console.log(
            `  ✓ ${pendingDetail.jobTitle} — IR35: ${enrichment.ir35Status} | ${enrichment.workingType} | ${enrichment.payRate ?? "no rate"} | ${enrichment.contractDuration ?? "no duration"}${posterEmail ? ` | ${posterEmail}` : ""}`
          );
        }
      } catch (err) {
        console.warn(`  ✗ Save failed: ${(err as Error).message}`);
        failed++;
      }
    }

    // Fetch detail page for current job
    let html: string;
    try {
      html = await fetchPage(card.detailUrl);
    } catch (err) {
      console.warn(`  LinkedIn fetch failed: ${(err as Error).message} — skipping`);
      openAiPromise = null;
      pendingDetail = null;
      failed++;
      continue;
    }

    pendingDetail = parseJobDetail(html, card);

    if (!pendingDetail.description) {
      console.warn("  No description — skipping enrichment");
      openAiPromise = null;
      continue;
    }

    // Pre-filter: drop obviously permanent jobs before spending OpenAI credits
    if (isPermanentByEmploymentType(pendingDetail.employmentType)) {
      console.log(`  ✗ Skipped — employment type is "${pendingDetail.employmentType}" (not a contract)`);
      openAiPromise = null;
      pendingDetail = null;
      continue;
    }

    // Fire OpenAI immediately — runs in background during jitter sleep
    openAiPromise = enrichWithOpenAI(pendingDetail);

    if (i < allNewJobs.length - 1) {
      const delay = jitter(MIN_DELAY, MAX_DELAY);
      await sleep(delay);
    }
  }

  // Save final job
  if (openAiPromise && pendingDetail) {
    try {
      const enrichment = await openAiPromise;
      if (!enrichment.isContract) {
        console.log(`  ✗ Skipped "${pendingDetail.jobTitle}" — AI classified as permanent`);
      } else {
        const posterEmail = await findPosterEmail(pendingDetail.posterName, pendingDetail.company, pendingDetail.companyUrl);
        await saveJob(pendingDetail, enrichment, posterEmail);
        await dispatchContractAlerts(pendingDetail, enrichment, alerts, proUsers);
        processed++;
        console.log(
          `  ✓ ${pendingDetail.jobTitle} — IR35: ${enrichment.ir35Status} | ${enrichment.workingType} | ${enrichment.payRate ?? "no rate"} | ${enrichment.contractDuration ?? "no duration"}${posterEmail ? ` | ${posterEmail}` : ""}`
        );
      }
    } catch (err) {
      console.warn(`  ✗ Final save failed: ${(err as Error).message}`);
      failed++;
    }
  }

  console.log(`\nDone. ${processed} saved, ${failed} failed.`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
