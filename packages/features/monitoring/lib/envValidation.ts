import process from "node:process";
import { getResendApiKey, getResendFromAddress } from "@calcom/lib/getResendConfig";

/**
 * R5.1: Production environment validation.
 * Validates that production secrets, Stripe keys, webhook URLs, callback URLs,
 * and email configuration are present and correctly formatted before the app
 * starts serving traffic.
 */

export type ValidationSeverity = "error" | "warning";

export type ValidationFinding = {
  key: string;
  severity: ValidationSeverity;
  message: string;
};

export type ValidationResult = {
  valid: boolean;
  findings: ValidationFinding[];
};

type Rule = {
  key: string;
  severity: ValidationSeverity;
  message: string;
  test: (value: string | undefined) => boolean;
};

const urlPattern = /^https?:\/\/.+/;

const rules: Rule[] = [
  {
    key: "DATABASE_URL",
    severity: "error",
    message: "Database URL must be a valid PostgreSQL connection string",
    test: (v) => Boolean(v && v.startsWith("postgresql://")),
  },
  {
    key: "NEXTAUTH_SECRET",
    severity: "error",
    message: "NextAuth secret is required for session signing",
    test: (v) => Boolean(v && v.length >= 32),
  },
  {
    key: "NEXTAUTH_URL",
    severity: "error",
    message: "NextAuth URL must be a valid HTTP(S) URL",
    test: (v) => Boolean(v && urlPattern.test(v)),
  },
  {
    key: "NEXT_PUBLIC_WEBAPP_URL",
    severity: "error",
    message: "Webapp URL must be a valid HTTP(S) URL",
    test: (v) => Boolean(v && urlPattern.test(v)),
  },
  {
    key: "STRIPE_PRIVATE_KEY",
    severity: "warning",
    message: "Stripe private key should start with sk_live_ or sk_test_",
    test: (v) => !v || v.startsWith("sk_live_") || v.startsWith("sk_test_"),
  },
  {
    key: "NEXT_PUBLIC_STRIPE_PUBLIC_KEY",
    severity: "warning",
    message: "Stripe public key should start with pk_live_ or pk_test_",
    test: (v) => !v || v.startsWith("pk_live_") || v.startsWith("pk_test_"),
  },
  {
    key: "STRIPE_WEBHOOK_SECRET",
    severity: "warning",
    message: "Stripe webhook secret should start with whsec_",
    test: (v) => !v || v.startsWith("whsec_"),
  },
  {
    key: "STRIPE_EVENT_SUBSCRIPTION_WEBHOOK_SECRET",
    severity: "warning",
    message: "Stripe event subscription webhook secret should start with whsec_",
    test: (v) => !v || v.startsWith("whsec_"),
  },
  {
    key: "EMAIL_SERVER_HOST",
    severity: "warning",
    message: "Email server host should be a valid hostname",
    test: (v) => !v || /^[a-zA-Z0-9.-]+$/.test(v),
  },
];

/**
 * Validate the current process.env against the production rules.
 * Returns a list of findings and an overall valid flag.
 * A result is valid when there are no error-severity findings.
 */
export function validateProductionEnv(env: NodeJS.ProcessEnv = process.env): ValidationResult {
  const findings: ValidationFinding[] = [];

  for (const rule of rules) {
    const value = env[rule.key];
    if (!rule.test(value)) {
      findings.push({
        key: rule.key,
        severity: rule.severity,
        message: rule.message,
      });
    }
  }

  const resendApiKey = getResendApiKey(env);
  if (resendApiKey && !resendApiKey.startsWith("re_")) {
    findings.push({
      key: "RESEND_API_KEY",
      severity: "warning",
      message: "Resend API key should start with re_",
    });
  }

  const resendFrom = getResendFromAddress(env);
  if (resendApiKey && (!resendFrom || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(resendFrom))) {
    findings.push({
      key: "RESEND_FROM",
      severity: "warning",
      message: "Set RESEND_FROM or EMAIL_FROM to a valid sender on a verified Resend domain",
    });
  }

  // Check that at least one email transport is configured
  const hasResend = Boolean(resendApiKey);
  const hasSmtp = Boolean(env.EMAIL_SERVER_HOST || env.EMAIL_SERVER);
  if (!hasResend && !hasSmtp) {
    findings.push({
      key: "EMAIL_TRANSPORT",
      severity: "warning",
      message:
        "No email transport configured (set RESEND_API_KEY, NEXT_RESEND_API_KEY, or EMAIL_SERVER_HOST)",
    });
  }

  const valid = !findings.some((f) => f.severity === "error");
  return { valid, findings };
}

/**
 * Validate and log findings. Throws if there are error-severity findings.
 * Useful as a startup guard in production.
 */
export function assertProductionEnv(env: NodeJS.ProcessEnv = process.env): void {
  const result = validateProductionEnv(env);
  for (const finding of result.findings) {
    const level = finding.severity === "error" ? "error" : "warn";
    console[level](`[env-validation] ${finding.severity.toUpperCase()}: ${finding.key} — ${finding.message}`);
  }
  if (!result.valid) {
    throw new Error(
      `Production environment validation failed with ${result.findings.filter((f) => f.severity === "error").length} error(s)`
    );
  }
}
