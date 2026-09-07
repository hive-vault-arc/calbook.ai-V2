import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { exit } from "node:process";

const trackedFiles = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);

// These fixtures exercise redaction and OAuth parsing with non-production credential-shaped values.
const knownFixtureFiles = new Set([
  "apps/api/v2/.env.example",
  "apps/api/v2/src/modules/cal-unified-calendars/services/google-calendar.service.spec.ts",
  "apps/api/v2/test/setEnvVars.ts",
  "packages/lib/redactSensitiveData.test.ts",
  "packages/testing/src/lib/bookingScenario/setupAndTeardown.ts",
]);

const secretPatterns = [
  { name: "AWS access key", expression: /AKIA[0-9A-Z]{16}/ },
  { name: "GitHub token", expression: /gh[pousr]_[A-Za-z0-9_]{36,}|github_pat_[A-Za-z0-9_]{22,}/ },
  { name: "Google OAuth client secret", expression: /GOCSPX-[A-Za-z0-9_-]{16,}/ },
  { name: "OpenAI API key", expression: /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/ },
  { name: "private key", expression: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: "Resend API key", expression: /re_[A-Za-z0-9]{16,}/ },
  { name: "Slack token", expression: /xox[baprs]-[A-Za-z0-9-]{20,}/ },
  { name: "Stripe live secret key", expression: /sk_live_[A-Za-z0-9]{16,}/ },
  { name: "Stripe restricted key", expression: /rk_live_[A-Za-z0-9]{16,}/ },
  { name: "Stripe webhook secret", expression: /whsec_[A-Za-z0-9]{16,}/ },
  {
    name: "hard-coded application secret",
    expression: /(?:NEXTAUTH_SECRET|CALENDSO_ENCRYPTION_KEY)\s*[:=]\s*["'][A-Za-z0-9+/=_-]{32,}["']/,
  },
];

const findings = [];

for (const file of trackedFiles) {
  if (file.startsWith(".yarn/") || knownFixtureFiles.has(file)) continue;

  const content = readFileSync(file);
  if (content.includes(0)) continue;

  const text = content.toString("utf8");
  for (const pattern of secretPatterns) {
    if (pattern.expression.test(text)) {
      findings.push(`${file}: possible ${pattern.name}`);
    }
  }
}

if (findings.length > 0) {
  console.error("Tracked-secret scan found possible credentials:");
  for (const finding of findings) console.error(`- ${finding}`);
  exit(1);
}

console.log("Tracked-secret scan passed.");
