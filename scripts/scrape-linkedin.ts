#!/usr/bin/env npx tsx
/**
 * LinkedIn Contract Scraper
 * Migrated from n8n "LinkedIn Job Scraper - Throttled Direct Scrape" workflow.
 *
 * Required env vars:
 *   SUPABASE_URL              - e.g. https://xxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY - service role key (not anon key)
 */

import { createClient } from "@supabase/supabase-js";

// ── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const SEARCH_PARAMS = {
  job_type: "C",           // C=Contract
  location: "United Kingdom",
  posted_within: "r86400", // last 24 hours
};

// Mirrors n8n throttle settings
const DELAY_BETWEEN_PAGES_MS = 4_000;
const DELAY_BETWEEN_TERMS_MS = 6_000;

// ── Supabase ──────────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Types ─────────────────────────────────────────────────────────────────────

interface JobCard {
  PostedDate: string;
  JobTitle: string;
  URL: string;
  Company: string;
  Location: string;
  _id: string;
  _detail_url: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function cleanHtml(s: string): string {
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

function buildSearchUrls(searchTerm: string): string[] {
  const base =
    "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search";
  const kw = encodeURIComponent(searchTerm);
  const loc = encodeURIComponent(SEARCH_PARAMS.location);
  const filters = `&f_JT=${SEARCH_PARAMS.job_type}&f_TPR=${SEARCH_PARAMS.posted_within}`;

  return [
    `${base}?keywords=${kw}&location=${loc}&start=0&count=10${filters}`,
    `${base}?keywords=${kw}&location=${loc}&start=10&count=10${filters}`,
  ];
}

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
      "Accept-Language": "en-GB,en;q=0.9",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      Referer: "https://www.linkedin.com/jobs/search/",
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }

  return res.text();
}

function parseJobCards(html: string): JobCard[] {
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
    const dateM = card.match(/datetime="([^"]+)"/);

    if (!idM || !urlM) continue;

    // Use today's UK date rather than LinkedIn's UTC datetime attribute.
    // LinkedIn stamps dates in UTC — jobs posted after midnight BST but before
    // midnight UTC would incorrectly appear as "yesterday".
    const ukToday = new Date().toLocaleDateString("en-CA", {
      timeZone: "Europe/London",
    }); // en-CA gives YYYY-MM-DD

    out.push({
      PostedDate: ukToday,
      JobTitle: titleM ? cleanHtml(titleM[1]) : "",
      URL: urlM[1],
      Company: coM ? cleanHtml(coM[1]) : "",
      Location: locM ? cleanHtml(locM[1]) : "",
      _id: idM[1],
      _detail_url: `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${idM[1]}`,
    });
  }

  // Deduplicate by _id
  const seen = new Set<string>();
  return out.filter((j) => {
    if (seen.has(j._id)) return false;
    seen.add(j._id);
    return true;
  });
}

function isTodayOrEarlier(dateStr: string): boolean {
  if (!dateStr) return false;
  const posted = new Date(dateStr);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return posted <= today;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Starting LinkedIn contract scraper…");

  // 1. Fetch existing job IDs to avoid duplicates
  const { data: existingRows, error: existingErr } = await supabase
    .from("LinkedinScrapeResults")
    .select("LinkedInJobID");

  if (existingErr) {
    console.error("Failed to fetch existing IDs:", existingErr.message);
    process.exit(1);
  }

  const existingIds = new Set(
    (existingRows ?? [])
      .map((r: { LinkedInJobID: string }) => String(r.LinkedInJobID ?? ""))
      .filter(Boolean)
  );
  console.log(`Loaded ${existingIds.size} existing job IDs`);

  // 2. Fetch search terms
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

  console.log(`Found ${searchTerms.length} search terms: ${searchTerms.join(", ")}`);

  let totalInserted = 0;

  // 3. Loop over each search term
  for (let i = 0; i < searchTerms.length; i++) {
    const term = searchTerms[i];

    if (i > 0) {
      console.log(`  Waiting ${DELAY_BETWEEN_TERMS_MS / 1000}s before next term…`);
      await sleep(DELAY_BETWEEN_TERMS_MS);
    }

    console.log(`\nSearching: "${term}"`);
    const urls = buildSearchUrls(term);
    const allCards: JobCard[] = [];

    // 4. Fetch each page for this search term
    for (let p = 0; p < urls.length; p++) {
      if (p > 0) {
        await sleep(DELAY_BETWEEN_PAGES_MS);
      }

      console.log(`  Fetching page ${p + 1}/${urls.length}…`);
      let html: string;

      try {
        html = await fetchPage(urls[p]);
      } catch (err) {
        console.warn(`  Page ${p + 1} failed: ${(err as Error).message} — skipping`);
        // Retry once after a longer pause
        await sleep(DELAY_BETWEEN_PAGES_MS * 2);
        try {
          html = await fetchPage(urls[p]);
        } catch {
          console.warn(`  Page ${p + 1} retry also failed — skipping`);
          continue;
        }
      }

      const cards = parseJobCards(html);
      console.log(`  Found ${cards.length} job cards`);
      allCards.push(...cards);
    }

    // 5. Filter: remove already-seen jobs
    const newJobs = allCards.filter((j) => !existingIds.has(j._id));
    console.log(`  ${newJobs.length} new jobs after dedup (${allCards.length - newJobs.length} already seen)`);

    if (newJobs.length === 0) continue;

    // 6. Filter: only jobs posted today or earlier
    const todayJobs = newJobs.filter((j) => isTodayOrEarlier(j.PostedDate));
    console.log(`  ${todayJobs.length} jobs posted today or earlier`);

    if (todayJobs.length === 0) continue;

    // 7. Insert into Supabase
    const { error: insertErr } = await supabase
      .from("LinkedInPendingScrape")
      .insert(todayJobs);

    if (insertErr) {
      console.error(`  Insert failed for "${term}": ${insertErr.message}`);
    } else {
      console.log(`  Inserted ${todayJobs.length} rows`);
      totalInserted += todayJobs.length;
      // Track newly inserted IDs to avoid cross-term duplicates in this run
      todayJobs.forEach((j) => existingIds.add(j._id));
    }
  }

  console.log(`\nDone. Inserted ${totalInserted} new contracts total.`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
