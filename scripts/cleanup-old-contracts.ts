#!/usr/bin/env npx tsx
// Notifies Google to deindex contracts older than 90 days (URL_DELETED).
// Contracts are kept in Supabase but hidden from the site via frontend filters.
// Usage:
//   npx tsx scripts/cleanup-old-contracts.ts [path/to/service-account.json] [--dry-run]
//
// Set GOOGLE_INDEXING_SERVICE_ACCOUNT env var as an alternative to the JSON file arg.
// Set SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY env vars.

import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const SITE_URL = "https://itcontracthub.co.uk";
const MAX_AGE_DAYS = 90;
const DELAY_MS = 500;

async function getGoogleAccessToken(sa: { client_email: string; private_key: string }): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/indexing",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })).toString("base64url");
  const sign = createSign("RSA-SHA256");
  sign.update(`${header}.${payload}`);
  const sig = sign.sign(sa.private_key, "base64url");
  const jwt = `${header}.${payload}.${sig}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  const json = await res.json() as { access_token?: string; error?: string };
  if (!json.access_token) throw new Error(`Token error: ${json.error}`);
  return json.access_token;
}

async function notifyGoogleRemoved(token: string, url: string): Promise<"ok" | "quota" | string> {
  const res = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url, type: "URL_DELETED" }),
  });
  if (res.ok) return "ok";
  const err = await res.json() as { error?: { message?: string; code?: number } };
  if (res.status === 429 || err.error?.code === 429) return "quota";
  return err.error?.message ?? `HTTP ${res.status}`;
}

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const jsonFile = args.find(a => !a.startsWith("--"));

  let saJson: string | undefined;
  if (jsonFile) {
    saJson = readFileSync(jsonFile, "utf-8");
    console.log(`Service account: ${jsonFile}`);
  } else if (process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT) {
    saJson = process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT;
    console.log("Service account: env var");
  } else {
    console.error("Usage: npx tsx scripts/cleanup-old-contracts.ts [service-account.json] [--dry-run]");
    process.exit(1);
  }
  const sa = JSON.parse(saJson!);

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    if (!supabaseUrl) console.error("Missing SUPABASE_URL (or VITE_SUPABASE_URL) env var");
    if (!supabaseKey) console.error("Missing SUPABASE_SERVICE_ROLE_KEY env var");
    process.exit(1);
  }
  const supabase = createClient(supabaseUrl, supabaseKey);

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - MAX_AGE_DAYS);
  console.log(`\nFinding contracts older than ${MAX_AGE_DAYS} days (before ${cutoff.toISOString().slice(0, 10)})...`);
  if (dryRun) console.log("DRY RUN — nothing will be deindexed.\n");

  const { data: contracts, error } = await supabase
    .from("LinkedinScrapeResults")
    .select("id, JobTitle, created_at")
    .lt("created_at", cutoff.toISOString())
    .order("created_at", { ascending: true });

  if (error) { console.error("Supabase error:", error.message); process.exit(1); }
  if (!contracts?.length) { console.log("No old contracts found. Nothing to do."); process.exit(0); }

  console.log(`Found ${contracts.length} contracts to remove.\n`);

  console.log("Getting Google access token...");
  const token = await getGoogleAccessToken(sa);
  console.log("Token OK. Starting cleanup...\n");

  let googleOk = 0, googleFailed = 0, quotaHit = false;
  const failedIds: number[] = [];

  for (let i = 0; i < contracts.length; i++) {
    const c = contracts[i];
    const url = `${SITE_URL}/contract/${c.id}`;
    process.stdout.write(`[${i + 1}/${contracts.length}] ${c.JobTitle?.slice(0, 50) ?? c.id}... `);

    if (dryRun) { console.log("(dry run)"); continue; }

    // Tell Google the URL is gone (kept in DB but hidden from site)
    const result = await notifyGoogleRemoved(token, url);
    if (result === "ok") {
      console.log("✓");
      googleOk++;
    } else if (result === "quota") {
      console.log("QUOTA EXCEEDED — stopping. Run again tomorrow.");
      quotaHit = true;
      break;
    } else {
      console.log(`✗ ${result}`);
      googleFailed++;
      failedIds.push(c.id);
    }

    if (i < contracts.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\n--- Done ---`);
  if (dryRun) {
    console.log(`Would remove: ${contracts.length} contracts`);
  } else {
    console.log(`✅ Deindexed from Google: ${googleOk}`);
    if (googleFailed > 0) console.log(`❌ Google errors:         ${googleFailed}`);
    if (quotaHit) console.log(`\n⚠️  Quota hit — run again tomorrow for the rest.`);
  }
}

main().catch(err => { console.error(err.message); process.exit(1); });
