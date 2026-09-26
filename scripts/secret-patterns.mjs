export const secretPatterns = [
  { name: "AWS access key", expression: /AKIA[0-9A-Z]{16}/ },
  { name: "GitHub token", expression: /gh[pousr]_[A-Za-z0-9_]{36,}|github_pat_[A-Za-z0-9_]{22,}/ },
  { name: "Google OAuth client secret", expression: /GOCSPX-[A-Za-z0-9_-]{16,}/ },
  { name: "Neon database credential", expression: /postgres(?:ql)?:\/\/[^\s:/]+:npg_[A-Za-z0-9_-]{8,}@/ },
  { name: "OpenAI API key", expression: /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/ },
  {
    name: "Render deploy hook",
    expression: /https:\/\/api\.render\.com\/deploy\/srv-[A-Za-z0-9_-]+\?key=[A-Za-z0-9_-]{8,}/,
  },
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

export function findSecretTypes(content) {
  return secretPatterns.filter(({ expression }) => expression.test(content)).map(({ name }) => name);
}

export function isProhibitedEnvFile(file) {
  return /(^|\/)\.env(?![^/]*(?:\.example|\.template)$)[^/]*$/i.test(file);
}
