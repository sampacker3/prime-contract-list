#!/usr/bin/env npx tsx
/**
 * One-time DB cleanup script.
 *
 * Run 1: De-duplicate rows with the same LinkedInJobID (keep lowest id).
 * Run 2: Delete zero-signal rows — jobs where ALL four enrichment fields are
 *         blank/unknown, indicating no contract signals were found (likely
 *         permanent roles that slipped through before the pre-screen was added).
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/cleanup-db.ts
 *
 * Or trigger via the cleanup-db GitHub Actions workflow.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function removeDuplicateJobIds() {
  console.log("── Step 1: Remove duplicate LinkedInJobID rows ──────────────────");

  // Fetch all rows, ordered by id asc so the first occurrence (lowest id) is the keeper
  const { data: rows, error } = await supabase
    .from("LinkedinScrapeResults")
    .select("id, LinkedInJobID")
    .order("id", { ascending: true });

  if (error) throw new Error(`Fetch failed: ${error.message}`);

  const seen = new Set<string>();
  const toDelete: number[] = [];

  for (const row of rows ?? []) {
    const key = String(row.LinkedInJobID ?? "");
    if (!key) continue;
    if (seen.has(key)) {
      toDelete.push(row.id);
    } else {
      seen.add(key);
    }
  }

  console.log(`  Found ${toDelete.length} duplicate rows to delete (keeping lowest id per LinkedInJobID)`);

  if (toDelete.length === 0) {
    console.log("  Nothing to do.");
    return;
  }

  // Delete in batches of 500 to stay within Supabase URL limits
  const BATCH = 500;
  let deleted = 0;
  for (let i = 0; i < toDelete.length; i += BATCH) {
    const batch = toDelete.slice(i, i + BATCH);
    const { error: delErr, count } = await supabase
      .from("LinkedinScrapeResults")
      .delete({ count: "exact" })
      .in("id", batch);
    if (delErr) throw new Error(`Delete failed: ${delErr.message}`);
    deleted += count ?? batch.length;
    console.log(`  Deleted batch ${Math.floor(i / BATCH) + 1}: ${count} rows`);
  }

  console.log(`  ✓ Total duplicate rows deleted: ${deleted}\n`);
}

async function removeZeroSignalRows() {
  console.log("── Step 2: Remove zero-signal rows ─────────────────────────────");
  console.log("  (PayRate=null AND IR35Status=Unknown AND ContractDuration=null AND WorkType=Unknown)");

  // Count first so we can report clearly
  const { count: before } = await supabase
    .from("LinkedinScrapeResults")
    .select("id", { count: "exact", head: true })
    .is("PayRate", null)
    .eq("IR35Status", "Unknown")
    .is("ContractDuration", null)
    .eq("WorkType", "Unknown");

  console.log(`  Found ${before ?? 0} zero-signal rows`);

  if (!before) {
    console.log("  Nothing to do.");
    return;
  }

  const { error, count } = await supabase
    .from("LinkedinScrapeResults")
    .delete({ count: "exact" })
    .is("PayRate", null)
    .eq("IR35Status", "Unknown")
    .is("ContractDuration", null)
    .eq("WorkType", "Unknown");

  if (error) throw new Error(`Delete failed: ${error.message}`);
  console.log(`  ✓ Deleted ${count ?? before} zero-signal rows\n`);
}

async function main() {
  console.log("Starting DB cleanup…\n");

  await removeDuplicateJobIds();
  await removeZeroSignalRows();

  // Final row count
  const { count } = await supabase
    .from("LinkedinScrapeResults")
    .select("id", { count: "exact", head: true });

  console.log(`── Done. LinkedinScrapeResults now has ${count} rows.`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
