#!/usr/bin/env npx tsx
/**
 * LinkedIn Job Enricher (Phase 2)
 * Migrated from n8n "J Scraper Working Part 2" workflow.
 *
 * For each row in LinkedInPendingScrape:
 *   1. Fetches full job detail page from LinkedIn (sequential + jitter to avoid rate limits)
 *   2. Parses HTML to extract structured fields
 *   3. Fires a single OpenAI call (overlapping with the next LinkedIn fetch delay)
 *      → summary, IR35Status, WorkingType, PayRate
 *   4. Writes enriched row to LinkedinScrapeResults
 *   5. Deletes processed row from LinkedInPendingScrape
 *
 * Required env vars:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   OPENAI_API_KEY
 *
 * Optional:
 *   ENRICH_MIN_DELAY_MS   (default 1500) — min ms between LinkedIn fetches
 *   ENRICH_MAX_DELAY_MS   (default 3000) — max ms between LinkedIn fetches
 */

import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

// ── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const MIN_DELAY = Number(process.env.ENRICH_MIN_DELAY_MS ?? 1500);
const MAX_DELAY = Number(process.env.ENRICH_MAX_DELAY_MS ?? 3000);
const LIMIT = process.env.ENRICH_LIMIT ? Number(process.env.ENRICH_LIMIT) : undefined;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY");
  process.exit(1);
}

// ── Clients ───────────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// ── Types ─────────────────────────────────────────────────────────────────────

interface PendingJob {
  id: number;
  _id: string;
  _detail_url: string;
  PostedDate: string;
  JobTitle: string;
  URL: string;
  Company: string;
  Location: string;
}

interface ParsedDetail {
  PostedDate: string;
  URL: string;
  Company: string;
  CompanyURL: string;
  CompanyLogo: string;
  Location: string;
  JobTitle: string;
  JobID: string;
  PostedText: string;
  SalaryRaw: string;
  Description: string;
  DescriptionHTML: string;
  SeniorityLevel: string;
  EmploymentType: string;
  JobFunction: string;
  Industries: string[];
}

interface Enrichment {
  summary: string;
  ir35Status: string;
  workingType: string;
  payRate: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const jitter = (min: number, max: number) =>
  min + Math.floor(Math.random() * (max - min));

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function cleanHtml(s: string | undefined): string {
  return (s ?? "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchWithRetry(url: string, attempt = 1): Promise<string> {
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
        : Math.min(5000 * attempt, 30000);
      console.warn(`  LinkedIn rate limited. Waiting ${waitMs / 1000}s (attempt ${attempt})…`);
      await sleep(waitMs);
      if (attempt >= 4) throw new Error("LinkedIn rate limit: max retries reached");
      return fetchWithRetry(url, attempt + 1);
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  } catch (err) {
    if (attempt >= 3) throw err;
    const waitMs = 2000 * attempt;
    console.warn(`  Fetch error (attempt ${attempt}): ${(err as Error).message}. Retrying in ${waitMs / 1000}s…`);
    await sleep(waitMs);
    return fetchWithRetry(url, attempt + 1);
  }
}

function parseJobDetail(html: string, fallback: PendingJob): ParsedDetail {
  const m = (pattern: RegExp) =>
    cleanHtml((html.match(pattern) ?? [])[1]);

  const title =
    m(/top-card-layout__title[^>]*>([\s\S]*?)<\/h2>/) || fallback.JobTitle;
  const company =
    m(/topcard__org-name-link[^>]*>([\s\S]*?)<\/a>/) || fallback.Company;
  const companyUrl =
    (html.match(/topcard__org-name-link[^>]*href="([^"]+)"/) ?? [])[1] ?? "";
  const location =
    m(/topcard__flavor--bullet[^>]*>([\s\S]*?)<\/span>/) || fallback.Location;
  const postedText = m(/posted-time-ago__text[^>]*>([\s\S]*?)<\/span>/);
  const jobId =
    (html.match(/jobPosting:(\d+)/) ?? html.match(/"(\d{10})"/) ?? [])[1] ??
    fallback._id;
  const salaryRaw = m(/compensation__salary[^>]*>([\s\S]*?)<\/div>/);
  const logo =
    (html.match(/artdeco-entity-image[^>]*data-delayed-url="([^"]+)"/) ?? [])[1] ?? "";

  const descHtml =
    (html.match(/description__text--rich([\s\S]*?)<\/section>/) ?? [])[1] ?? "";
  const description = cleanHtml(descHtml);

  const crit = (label: string) =>
    cleanHtml(
      (html.match(
        new RegExp(`${label}[\\s\\S]*?description__job-criteria-text[^>]*>([\\s\\S]*?)<\\/span>`)
      ) ?? [])[1]
    );

  const industriesRaw = crit("Industries");
  const industries = industriesRaw
    ? industriesRaw.split(",").map((s) => s.trim())
    : [];

  return {
    PostedDate: fallback.PostedDate,
    URL: fallback.URL,
    Company: company,
    CompanyURL: companyUrl,
    CompanyLogo: logo,
    Location: location,
    JobTitle: title,
    JobID: jobId,
    PostedText: postedText,
    SalaryRaw: salaryRaw,
    Description: description,
    DescriptionHTML: descHtml,
    SeniorityLevel: crit("Seniority level"),
    EmploymentType: crit("Employment type"),
    JobFunction: crit("Job function"),
    Industries: industries,
  };
}

async function enrichWithOpenAI(job: ParsedDetail): Promise<Enrichment> {
  const prompt = `You are analysing a UK contract job posting. Return ONLY valid JSON with these exact keys:

{
  "summary": "2-3 sentence summary of the role and key skills required. Do not mention the company name.",
  "ir35Status": "Inside IR35" | "Outside IR35" | "Unknown",
  "workingType": "Remote" | "Hybrid" | "Onsite" | "Unknown",
  "payRate": "extracted pay rate string, or null if not mentioned"
}

Job description:
${job.Description}

Salary info: ${job.SalaryRaw || "not provided"}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: prompt }],
    temperature: 0,
  });

  const raw = response.choices[0]?.message?.content ?? "{}";

  try {
    const parsed = JSON.parse(raw);
    return {
      summary: parsed.summary ?? "",
      ir35Status: parsed.ir35Status ?? "Unknown",
      workingType: parsed.workingType ?? "Unknown",
      payRate: parsed.payRate ?? null,
    };
  } catch {
    console.warn("  Failed to parse OpenAI JSON response, using defaults");
    return { summary: "", ir35Status: "Unknown", workingType: "Unknown", payRate: null };
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Starting LinkedIn job enricher…");

  const query = supabase.from("LinkedInPendingScrape").select("*");
  if (LIMIT) query.limit(LIMIT);
  const { data: pendingRows, error } = await query;

  if (error) {
    console.error("Failed to fetch pending jobs:", error.message);
    process.exit(1);
  }

  const jobs = (pendingRows ?? []) as PendingJob[];
  console.log(`Found ${jobs.length} pending jobs to enrich\n`);

  if (jobs.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  let processed = 0;
  let failed = 0;

  // Pipeline: fire OpenAI call immediately after parse, overlap with jitter sleep
  let openAiPromise: Promise<Enrichment> | null = null;
  let currentDetail: ParsedDetail | null = null;
  let currentPending: PendingJob | null = null;

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    console.log(`[${i + 1}/${jobs.length}] ${job.JobTitle ?? job._id}`);

    // 1. Save + delete the PREVIOUS job's enrichment (it was running during our sleep)
    if (openAiPromise && currentDetail && currentPending) {
      try {
        const enrichment = await openAiPromise;

        const { error: insertErr } = await supabase
          .from("LinkedinScrapeResults")
          .insert({
            PostedDate: currentDetail.PostedDate,
            JobTitle: currentDetail.JobTitle,
            URL: currentDetail.URL,
            Description: enrichment.summary,
            EmploymentType: currentDetail.EmploymentType,
            Location: currentDetail.Location,
            PostedText: currentDetail.PostedText,
            LinkedInJobID: currentDetail.JobID,
            Company: currentDetail.Company,
            PayRate: enrichment.payRate,
            IR35Status: enrichment.ir35Status,
            WorkType: enrichment.workingType,
          });

        if (insertErr) {
          console.warn(`  Insert failed: ${insertErr.message}`);
          failed++;
        } else {
          await supabase
            .from("LinkedInPendingScrape")
            .delete()
            .eq("id", currentPending.id);
          processed++;
          console.log(
            `  ✓ Saved (IR35: ${enrichment.ir35Status} | ${enrichment.workingType} | ${enrichment.payRate ?? "no rate"})`
          );
        }
      } catch (err) {
        console.warn(`  OpenAI/save failed: ${(err as Error).message}`);
        failed++;
      }
    }

    // 2. Fetch LinkedIn detail for current job
    let html: string;
    try {
      console.log(`  Fetching detail…`);
      html = await fetchWithRetry(job._detail_url);
    } catch (err) {
      console.warn(`  LinkedIn fetch failed: ${(err as Error).message} — skipping`);
      openAiPromise = null;
      currentDetail = null;
      currentPending = null;
      failed++;
      continue;
    }

    // 3. Parse HTML
    currentDetail = parseJobDetail(html, job);
    currentPending = job;

    if (!currentDetail.Description) {
      console.warn("  No description found — skipping AI enrichment");
      openAiPromise = null;
      continue;
    }

    // 4. Fire OpenAI call immediately (runs during next iteration's sleep)
    console.log(`  Enriching with OpenAI…`);
    openAiPromise = enrichWithOpenAI(currentDetail);

    // 5. Jitter sleep before next LinkedIn fetch (OpenAI runs in background)
    if (i < jobs.length - 1) {
      const delay = jitter(MIN_DELAY, MAX_DELAY);
      console.log(`  Waiting ${delay}ms before next fetch…`);
      await sleep(delay);
    }
  }

  // Handle the final job's enrichment
  if (openAiPromise && currentDetail && currentPending) {
    try {
      const enrichment = await openAiPromise;

      const { error: insertErr } = await supabase
        .from("LinkedinScrapeResults")
        .insert({
          PostedDate: currentDetail.PostedDate,
          JobTitle: currentDetail.JobTitle,
          URL: currentDetail.URL,
          Description: enrichment.summary,
          EmploymentType: currentDetail.EmploymentType,
          Location: currentDetail.Location,
          PostedText: currentDetail.PostedText,
          LinkedInJobID: currentDetail.JobID,
          Company: currentDetail.Company,
          PayRate: enrichment.payRate,
          IR35Status: enrichment.ir35Status,
          WorkType: enrichment.workingType,
        });

      if (insertErr) {
        console.warn(`  Insert failed: ${insertErr.message}`);
        failed++;
      } else {
        await supabase
          .from("LinkedInPendingScrape")
          .delete()
          .eq("id", currentPending.id);
        processed++;
        console.log(
          `  ✓ Saved (IR35: ${enrichment.ir35Status} | ${enrichment.workingType} | ${enrichment.payRate ?? "no rate"})`
        );
      }
    } catch (err) {
      console.warn(`  Final job failed: ${(err as Error).message}`);
      failed++;
    }
  }

  console.log(`\nDone. ${processed} enriched, ${failed} failed.`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
