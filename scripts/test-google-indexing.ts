#!/usr/bin/env npx tsx
// Quick test: verifies the Google Indexing API service account works.
// Usage: npx tsx scripts/test-google-indexing.ts /path/to/service-account.json
// Or set GOOGLE_INDEXING_SERVICE_ACCOUNT env var to the JSON contents.

import { createSign } from "node:crypto";

const TEST_URL = "https://itcontracthub.co.uk/contract/1";

async function getGoogleAccessToken(sa: {
  client_email: string;
  private_key: string;
}): Promise<string> {
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
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const json = await res.json() as { access_token?: string; error?: string; error_description?: string };
  if (!json.access_token) throw new Error(`Token error: ${json.error} — ${json.error_description}`);
  return json.access_token;
}

async function main() {
  // Load service account from arg or env
  let saJson: string | undefined;
  if (process.argv[2]) {
    const { readFileSync } = await import("node:fs");
    saJson = readFileSync(process.argv[2], "utf-8");
    console.log(`Using service account from file: ${process.argv[2]}`);
  } else if (process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT) {
    saJson = process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT;
    console.log("Using GOOGLE_INDEXING_SERVICE_ACCOUNT env var");
  } else {
    console.error("Usage: npx tsx scripts/test-google-indexing.ts /path/to/service-account.json");
    console.error("  or set GOOGLE_INDEXING_SERVICE_ACCOUNT env var");
    process.exit(1);
  }

  const sa = JSON.parse(saJson);
  console.log(`Service account email: ${sa.client_email}`);

  // 1. Get access token
  process.stdout.write("Getting access token... ");
  const token = await getGoogleAccessToken(sa);
  console.log("OK");

  // 2. Call the Indexing API
  process.stdout.write(`Notifying Google about ${TEST_URL}... `);
  const res = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url: TEST_URL, type: "URL_UPDATED" }),
  });

  const result = await res.json() as { urlNotificationMetadata?: object; error?: { message: string } };

  if (res.ok) {
    console.log("OK ✓");
    console.log("Response:", JSON.stringify(result, null, 2));
    console.log("\n✅ Google Indexing API is working correctly.");
  } else {
    console.log("FAILED ✗");
    console.error("Error:", result.error?.message ?? JSON.stringify(result));
    if (result.error?.message?.includes("Permission denied")) {
      console.error("\n⚠️  The service account needs Owner access in Google Search Console.");
      console.error("   Go to Search Console → Settings → Users and permissions → Add Owner");
    }
    process.exit(1);
  }
}

main().catch(err => { console.error(err.message); process.exit(1); });
