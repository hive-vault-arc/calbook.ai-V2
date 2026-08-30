import { execFileSync } from "node:child_process";
import { exit } from "node:process";

const stagedFiles = execFileSync("git", ["diff", "--cached", "--name-only", "-z"], {
  encoding: "utf8",
})
  .split("\0")
  .filter(Boolean);

const prohibitedEnvFile = /(^|\/)\.env(?:\.local|\.development\.local|\.test\.local|\.production\.local)?$/;
const secretPatterns = [
  { name: "Stripe live secret key", expression: /sk_live_[A-Za-z0-9]{16,}/ },
  { name: "Stripe webhook secret", expression: /whsec_[A-Za-z0-9]{16,}/ },
  { name: "Resend API key", expression: /re_[A-Za-z0-9]{16,}/ },
  { name: "Google OAuth client secret", expression: /GOCSPX-[A-Za-z0-9_-]{16,}/ },
  { name: "private key", expression: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
];

const errors = [];

for (const file of stagedFiles) {
  if (prohibitedEnvFile.test(file)) {
    errors.push(`${file}: local environment files must not be committed`);
  }

  const diff = execFileSync("git", ["diff", "--cached", "--unified=0", "--", file], {
    encoding: "utf8",
  });

  for (const line of diff.split("\n")) {
    if (!line.startsWith("+") || line.startsWith("+++")) continue;

    for (const pattern of secretPatterns) {
      if (pattern.expression.test(line)) {
        errors.push(`${file}: possible ${pattern.name} in staged content`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error("Secret check blocked this commit:");
  for (const error of errors) console.error(`- ${error}`);
  exit(1);
}

console.log("Secret check passed.");
