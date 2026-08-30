import { randomUUID } from "node:crypto";
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
  correlationId?: string;
};

/**
 * Log a structured failure event with a consistent category tag.
 * The event is sent to both the application logger (tslog) and Sentry
 * (when configured) so that dashboards and alerts can filter by category.
 */
export function logFailure(params: LogFailureParams): string {
  const { category, message, error, context } = params;
  const correlationId = params.correlationId ?? randomUUID();
  const errorContext = {
    category,
    message,
    ...context,
    correlationId,
  };

  log.error(message, errorContext);

  if (error) {
    captureException(error, {
      tags: { failureCategory: category, correlationId },
      extra: errorContext,
    });
  } else {
    captureMessage(message, {
      level: "warning",
      tags: { failureCategory: category, correlationId },
      extra: errorContext,
    });
  }
  return correlationId;
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
  correlationId?: string;
  category?: FailureCategory;
  context?: Record<string, unknown>;
}): void {
  const { service, errorCount, windowMinutes, threshold, correlationId, category, context } = params;
  const message = `Elevated 5xx errors for ${service}: ${errorCount} errors in ${windowMinutes}m (threshold: ${threshold})`;
  const alertContext = { service, errorCount, windowMinutes, threshold, correlationId, category, ...context };

  log.error(message, alertContext);

  captureException(new Error(message), {
    tags: {
      failureCategory: "elevated_5xx",
      service,
      ...(category ? { sourceFailureCategory: category } : {}),
      ...(correlationId ? { correlationId } : {}),
    },
    level: "fatal",
    extra: alertContext,
  });
}
