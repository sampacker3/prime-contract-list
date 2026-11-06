#!/usr/bin/env npx tsx
// Bulk-submits existing contracts to the Google Indexing API.
// Processes most-recent first. Respects the 200/day quota by default.
// Usage:
//   npx tsx scripts/bulk-index-contracts.ts [path/to/service-account.json] [--limit N]
//
// Set GOOGLE_INDEXING_SERVICE_ACCOUNT env var as an alternative to the JSON file arg.
// Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars (or use .env.local).

import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const SITE_URL = "https://itcontracthub.co.uk";
const DEFAULT_LIMIT = 200; // Google's free daily quota
const DELAY_MS = 500; // pause between requests to avoid bursting

// --- Google auth ---
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

async function notifyGoogle(token: string, url: string): Promise<"ok" | "quota" | string> {
  const res = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url, type: "URL_UPDATED" }),
  });
  if (res.ok) return "ok";
  const err = await res.json() as { error?: { message?: string; code?: number } };
  if (res.status === 429 || err.error?.code === 429) return "quota";
  return err.error?.message ?? `HTTP ${res.status}`;
}

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  // Parse args
  const args = process.argv.slice(2);
  const limitArg = args.indexOf("--limit");
  const limit = limitArg !== -1 ? parseInt(args[limitArg + 1]) : DEFAULT_LIMIT;
  const jsonFile = args.find(a => !a.startsWith("--") && args.indexOf(a) !== limitArg + 1);

  // Load service account
  let saJson: string | undefined;
  if (jsonFile) {
    saJson = readFileSync(jsonFile, "utf-8");
    console.log(`Service account: ${jsonFile}`);
  } else if (process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT) {
    saJson = process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT;
    console.log("Service account: env var");
  } else {
    console.error("Usage: npx tsx scripts/bulk-index-contracts.ts [service-account.json] [--limit N]");
    process.exit(1);
  }
  const sa = JSON.parse(saJson!);

  // Load Supabase
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch contracts (most recent first)
  console.log(`\nFetching up to ${limit} contracts from Supabase...`);
  const { data: contracts, error } = await supabase
    .from("LinkedinScrapeResults")
    .select("id, JobTitle, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) { console.error("Supabase error:", error.message); process.exit(1); }
  if (!contracts?.length) { console.log("No contracts found."); process.exit(0); }

  console.log(`Found ${contracts.length} contracts. Getting Google access token...`);
  const token = await getGoogleAccessToken(sa);
  console.log("Token OK. Starting indexing...\n");

  let ok = 0, failed = 0, quotaHit = false;

  for (let i = 0; i < contracts.length; i++) {
    const c = contracts[i];
    const url = `${SITE_URL}/contract/${c.id}`;
    process.stdout.write(`[${i + 1}/${contracts.length}] ${c.JobTitle?.slice(0, 50) ?? c.id}... `);

    const result = await notifyGoogle(token, url);

    if (result === "ok") {
      console.log("✓");
      ok++;
    } else if (result === "quota") {
      console.log("QUOTA EXCEEDED");
      console.log(`\n⚠️  Daily quota hit after ${ok} URLs. Run again tomorrow for the rest.`);
      quotaHit = true;
      break;
    } else {
      console.log(`✗ ${result}`);
      failed++;
    }

    if (i < contracts.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\n--- Done ---`);
  console.log(`✅ Indexed: ${ok}`);
  if (failed > 0) console.log(`❌ Failed:  ${failed}`);
  if (!quotaHit && contracts.length === limit) {
    console.log(`\nThere may be more contracts. Run again with --limit ${limit * 2} or tomorrow for the next batch.`);
  }
}

main().catch(err => { console.error(err.message); process.exit(1); });
