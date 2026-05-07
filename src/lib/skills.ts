// Ordered by priority — more specific/longer terms first to avoid false substring matches
const SKILL_LIST: string[] = [
  // Cloud & Infrastructure
  "AWS", "Azure", "GCP", "Google Cloud", "Terraform", "Kubernetes", "Docker", "Helm",
  "Ansible", "Pulumi", "CloudFormation", "OpenShift", "VMware",
  // Languages
  "Python", "TypeScript", "JavaScript", "Java", "C#", "C++", "Go", "Rust",
  "PHP", "Ruby", "Swift", "Kotlin", "Scala", "R", "Perl", "Bash", "PowerShell",
  // Frontend
  "React", "Angular", "Vue", "Next.js", "Svelte", "Tailwind", "Redux", "GraphQL",
  "HTML", "CSS", "SASS",
  // Backend / Frameworks
  "Node.js", "Django", "FastAPI", "Flask", "Spring Boot", "Spring", ".NET", "ASP.NET",
  "Laravel", "Rails", "Express",
  // Databases
  "PostgreSQL", "MySQL", "SQL Server", "Oracle", "MongoDB", "Redis", "Elasticsearch",
  "DynamoDB", "Cassandra", "Snowflake", "BigQuery", "Redshift", "dbt", "SQL",
  // Data & AI / ML
  "Machine Learning", "Deep Learning", "NLP", "LLM", "OpenAI", "TensorFlow", "PyTorch",
  "Spark", "Hadoop", "Kafka", "Airflow", "Databricks", "Pandas", "NumPy",
  "Power BI", "Tableau", "Looker", "Qlik",
  // DevOps / CI-CD
  "CI/CD", "Jenkins", "GitHub Actions", "GitLab CI", "CircleCI", "ArgoCD",
  "Prometheus", "Grafana", "Datadog", "New Relic", "ELK",
  // Security
  "Penetration Testing", "ISO 27001", "SOC 2", "SIEM", "NIST", "Zero Trust",
  "IAM", "Splunk", "CrowdStrike", "Qualys",
  // Enterprise / ERP
  "SAP", "Salesforce", "ServiceNow", "Workday", "Dynamics 365",
  // Methodologies / Certs
  "Agile", "Scrum", "Kanban", "PRINCE2", "PMP", "ITIL", "DevOps",
  "Microservices", "REST", "API", "Architecture",
];

// Pre-lowercase skill list for fast case-insensitive matching
const SKILL_LOWER = SKILL_LIST.map((s) => ({ label: s, lower: s.toLowerCase() }));

export function extractSkills(jobTitle: string | null, description: string | null, max = 8): string[] {
  const haystack = `${jobTitle ?? ""} ${description ?? ""}`.toLowerCase();
  if (!haystack.trim()) return [];

  // First pass: match against known skills list
  const found: string[] = [];
  for (const { label, lower } of SKILL_LOWER) {
    if (haystack.includes(lower)) {
      found.push(label);
      if (found.length >= max) break;
    }
  }

  return found;
}
