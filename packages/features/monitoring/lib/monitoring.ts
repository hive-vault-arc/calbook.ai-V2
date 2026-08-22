import logger from "@calcom/lib/logger";
import { captureException, captureMessage } from "@sentry/nextjs";

const log = logger.getSubLogger({ prefix: ["monitoring"] });

/**
 * R5.3: Structured failure categories for SaaS v1 monitoring.
 * Each category maps to a specific failure surface that dashboards
 * and alerts should track.
 */
export const FAILURE_CATEGORIES = {
  CHECKOUT: "checkout_failure",
  WEBHOOK: "webhook_failure",
  EMAIL: "email_failure",
  BOOKING: "booking_failure",
  PAYMENT: "payment_failure",
  SUBSCRIPTION: "subscription_failure",
} as const;

export type FailureCategory = (typeof FAILURE_CATEGORIES)[keyof typeof FAILURE_CATEGORIES];

type LogFailureParams = {
  category: FailureCategory;
  message: string;
  error?: unknown;
  context?: Record<string, unknown>;
};

/**
 * Log a structured failure event with a consistent category tag.
 * The event is sent to both the application logger (tslog) and Sentry
 * (when configured) so that dashboards and alerts can filter by category.
 */
export function logFailure(params: LogFailureParams): void {
  const { category, message, error, context } = params;
  const errorContext = {
    category,
    message,
    ...context,
  };

  log.error(message, errorContext);

  if (error) {
    captureException(error, {
      tags: { failureCategory: category },
      extra: errorContext,
    });
  } else {
    captureMessage(message, {
      level: "warning",
      tags: { failureCategory: category },
      extra: errorContext,
    });
  }
}

/**
 * R5.3: Alert hook for elevated 5xx response rates.
 * Called when a service detects a threshold breach (e.g., more than N
 * failures in a time window). The hook logs a critical alert and
 * reports it to Sentry with a distinct tag so it can be routed to
 * on-call channels.
 */
export function alertElevatedErrors(params: {
  service: string;
  errorCount: number;
  windowMinutes: number;
  threshold: number;
}): void {
  const { service, errorCount, windowMinutes, threshold } = params;
  const message = `Elevated 5xx errors for ${service}: ${errorCount} errors in ${windowMinutes}m (threshold: ${threshold})`;

  log.error(message, { service, errorCount, windowMinutes, threshold });

  captureException(new Error(message), {
    tags: {
      failureCategory: "elevated_5xx",
      service,
    },
    level: "fatal",
    extra: { errorCount, windowMinutes, threshold },
  });
}
