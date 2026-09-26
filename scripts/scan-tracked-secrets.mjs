import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { exit } from "node:process";
import { findSecretTypes } from "./secret-patterns.mjs";

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

const findings = [];

for (const file of trackedFiles) {
  if (file.startsWith(".yarn/") || knownFixtureFiles.has(file)) continue;

  const content = readFileSync(file);
  if (content.includes(0)) continue;

  const text = content.toString("utf8");
  for (const secretType of findSecretTypes(text)) {
    findings.push(`${file}: possible ${secretType}`);
  }
}

if (findings.length > 0) {
  console.error("Tracked-secret scan found possible credentials:");
  for (const finding of findings) console.error(`- ${finding}`);
  exit(1);
}

console.log("Tracked-secret scan passed.");
