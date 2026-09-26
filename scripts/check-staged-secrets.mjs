import { execFileSync } from "node:child_process";
import { exit } from "node:process";
import { findSecretTypes, isProhibitedEnvFile } from "./secret-patterns.mjs";

const stagedFiles = execFileSync("git", ["diff", "--cached", "--name-only", "-z"], {
  encoding: "utf8",
})
  .split("\0")
  .filter(Boolean);

const errors = [];

for (const file of stagedFiles) {
  if (isProhibitedEnvFile(file)) {
    errors.push(`${file}: local environment files must not be committed`);
  }

  const diff = execFileSync("git", ["diff", "--cached", "--unified=0", "--", file], {
    encoding: "utf8",
  });

  for (const line of diff.split("\n")) {
    if (!line.startsWith("+") || line.startsWith("+++")) continue;

    for (const secretType of findSecretTypes(line)) {
      errors.push(`${file}: possible ${secretType} in staged content`);
    }
  }
}

if (errors.length > 0) {
  console.error("Secret check blocked this commit:");
  for (const error of errors) console.error(`- ${error}`);
  exit(1);
}

console.log("Secret check passed.");
