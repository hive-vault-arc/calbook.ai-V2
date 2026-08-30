import { getRedisService } from "@calcom/features/di/containers/Redis";
import type { FailureCategory } from "@calcom/features/monitoring/lib/monitoring";
import type { IRedisService } from "@calcom/features/redis/IRedisService";
import logger from "@calcom/lib/logger";
import { alertElevatedErrors } from "./monitoring";

const log = logger.getSubLogger({ prefix: ["error-rate-tracker"] });

type ErrorEvent = {
  timestamp: number;
  correlationId?: string;
  category?: FailureCategory;
  context?: Record<string, unknown>;
};

type RecordErrorParams = Omit<ErrorEvent, "timestamp">;

export class ErrorRateTracker {
  constructor(
    private readonly windowMs: number = 5 * 60 * 1000,
    private readonly threshold: number = 10,
    private readonly cooldownMs: number = 15 * 60 * 1000,
    private readonly redis: IRedisService = getRedisService()
  ) {}

  async recordError(service: string, params: RecordErrorParams = {}): Promise<void> {
    const now = Date.now();
    const serviceKey = service.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
    const windowKey = `monitoring:error-window:${serviceKey}`;
    const cooldownKey = `monitoring:alert-cooldown:${serviceKey}`;

    try {
      await this.redis.lpush<ErrorEvent>(windowKey, { timestamp: now, ...params });
      await this.redis.expire(windowKey, Math.max(1, Math.ceil(this.windowMs / 1000)));
      const events = await this.redis.lrange<ErrorEvent>(windowKey, 0, this.threshold - 1);
      const recentEvents = events.filter((event) => event.timestamp > now - this.windowMs);
      if (recentEvents.length < this.threshold) return;

      await this.redis.del(windowKey);
      const alertClaim = await this.redis.set(
        cooldownKey,
        { timestamp: now, correlationId: params.correlationId },
        { ttl: this.cooldownMs, ifNotExists: true }
      );
      if (alertClaim !== "OK") return;

      alertElevatedErrors({
        service,
        errorCount: recentEvents.length,
        windowMinutes: Math.round(this.windowMs / 60_000),
        threshold: this.threshold,
        correlationId: params.correlationId,
        category: params.category,
        context: params.context,
      });
    } catch (error) {
      log.error("Distributed error-rate tracking failed", {
        service,
        correlationId: params.correlationId,
        error,
      });
    }
  }

  async getErrorCount(service: string): Promise<number> {
    const now = Date.now();
    const serviceKey = service.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
    try {
      const events = await this.redis.lrange<ErrorEvent>(
        `monitoring:error-window:${serviceKey}`,
        0,
        this.threshold - 1
      );
      return events.filter((event) => event.timestamp > now - this.windowMs).length;
    } catch (error) {
      log.error("Unable to read distributed error rate", { service, error });
      return 0;
    }
  }
}

export const errorRateTracker = new ErrorRateTracker();
