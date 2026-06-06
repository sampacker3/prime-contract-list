/**
 * Replaces all rows in LinkedInScrapeList with the full UK IT/Tech search term list.
 * Usage: npx tsx scripts/seed-search-terms.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SEARCH_TERMS = [
  // Cloud & Infrastructure
  "AWS",
  "Azure",
  "GCP",
  "Cloud Engineer",
  "DevOps Engineer",
  "Kubernetes",
  "Terraform",
  "Docker",
  "Linux Administrator",
  "VMware",
  "Citrix",
  "Azure DevOps",
  "Site Reliability Engineer",

  // Data & Analytics
  "Data Engineer",
  "Data Architect",
  "Data Analyst",
  "Power BI",
  "Tableau",
  "Snowflake",
  "Databricks",
  "dbt",
  "Azure Data Factory",
  "AWS Glue",
  "Apache Spark",
  "ETL Developer",
  "Microsoft Fabric",

  // AI & Machine Learning
  "Machine Learning Engineer",
  "MLOps",
  "AI Engineer",
  "NLP Engineer",
  "Data Scientist",

  // Software Development
  "Java Developer",
  "Python Developer",
  ".NET Developer",
  "C# Developer",
  "Node.js Developer",
  "React Developer",
  "Angular Developer",
  "Full Stack Developer",
  "Backend Developer",
  "TypeScript Developer",
  "Scala Developer",

  // Security & Compliance
  "Cyber Security",
  "Security Architect",
  "Penetration Tester",
  "SOC Analyst",
  "SIEM",
  "IAM Engineer",
  "Splunk",
  "Security Engineer",

  // Integration & Middleware
  "MuleSoft",
  "Boomi",
  "Kafka",
  "API Developer",
  "IBM MQ",
  "Azure Integration",
  "Informatica",

  // ERP & CRM
  "SAP",
  "Salesforce",
  "ServiceNow",
  "Oracle",
  "Dynamics 365",

  // Networking
  "Network Engineer",
  "Cisco",
  "Juniper",
  "SD-WAN",
  "Network Architect",

  // Business Analysis & Project Delivery
  "Business Analyst",
  "Project Manager",
  "Programme Manager",
  "Scrum Master",
  "Agile Coach",
  "Product Owner",
  "Change Manager",

  // Testing & QA
  "Test Analyst",
  "Test Automation",
  "Performance Testing",
  "Selenium",
  "Playwright",

  // Database & Storage
  "SQL Server DBA",
  "Oracle DBA",
  "PostgreSQL",
  "MongoDB",
  "Cassandra",
];

async function main() {
  console.log(`Replacing LinkedInScrapeList with ${SEARCH_TERMS.length} terms…\n`);

  // Delete all existing rows
  const { error: deleteErr } = await supabase
    .from("LinkedInScrapeList")
    .delete()
    .neq("SearchTerm", "__no_match__"); // delete all rows

  if (deleteErr) {
    console.error("Failed to delete existing terms:", deleteErr.message);
    process.exit(1);
  }
  console.log("✓ Cleared existing search terms");

  // Insert new terms
  const rows = SEARCH_TERMS.map((term) => ({ SearchTerm: term }));
  const { error: insertErr } = await supabase
    .from("LinkedInScrapeList")
    .insert(rows);

  if (insertErr) {
    console.error("Failed to insert new terms:", insertErr.message);
    process.exit(1);
  }

  console.log(`✓ Inserted ${SEARCH_TERMS.length} search terms`);
  console.log("\nTerms added:");
  SEARCH_TERMS.forEach((t) => console.log(`  • ${t}`));
}

main();
