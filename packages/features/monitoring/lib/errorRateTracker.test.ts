import type { IRedisService } from "@calcom/features/redis/IRedisService";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sentryMocks = vi.hoisted(() => ({ captureException: vi.fn() }));

vi.mock("@sentry/nextjs", () => ({
  captureException: sentryMocks.captureException,
}));

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
  },
}));

import { ErrorRateTracker } from "./errorRateTracker";

function createRedis(): IRedisService {
  const lists = new Map<string, unknown[]>();
  const values = new Map<string, unknown>();
  return {
    async get<TData>(key: string): Promise<TData | null> {
      return (values.get(key) as TData | undefined) ?? null;
    },
    async set<TData>(
      key: string,
      value: TData,
      opts?: { ttl?: number; ifNotExists?: boolean }
    ): Promise<"OK" | TData | null> {
      if (opts?.ifNotExists && values.has(key)) return null;
      values.set(key, value);
      return "OK";
    },
    async expire(): Promise<0 | 1> {
      return 1;
    },
    async lrange<TResult = string>(key: string, start: number, end: number): Promise<TResult[]> {
      return (lists.get(key)?.slice(start, end + 1) ?? []) as TResult[];
    },
    async lpush<TData>(key: string, ...elements: TData[]): Promise<number> {
      const list = lists.get(key) ?? [];
      list.unshift(...elements);
      lists.set(key, list);
      return list.length;
    },
    async del(key: string): Promise<number> {
      const deleted = Number(lists.delete(key) || values.delete(key));
      return deleted;
    },
  };
}

describe("ErrorRateTracker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => vi.useRealTimers());

  it("shares the error window across tracker instances", async () => {
    const redis = createRedis();
    const firstInstance = new ErrorRateTracker(60_000, 3, 120_000, redis);
    const secondInstance = new ErrorRateTracker(60_000, 3, 120_000, redis);

    await firstInstance.recordError("webhook");
    await secondInstance.recordError("webhook");

    await expect(firstInstance.getErrorCount("webhook")).resolves.toBe(2);
    expect(sentryMocks.captureException).not.toHaveBeenCalled();
  });

  it("alerts once when the distributed threshold is reached", async () => {
    const redis = createRedis();
    const firstInstance = new ErrorRateTracker(60_000, 3, 120_000, redis);
    const secondInstance = new ErrorRateTracker(60_000, 3, 120_000, redis);

    await firstInstance.recordError("webhook");
    await secondInstance.recordError("webhook");
    await firstInstance.recordError("webhook", {
      correlationId: "trace-123",
      category: "webhook_failure",
      context: { eventType: "invoice.payment_failed" },
    });

    expect(sentryMocks.captureException).toHaveBeenCalledTimes(1);
    expect(sentryMocks.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: expect.objectContaining({ correlationId: "trace-123", service: "webhook" }),
        extra: expect.objectContaining({ eventType: "invoice.payment_failed" }),
      })
    );
  });

  it("uses an atomic Redis cooldown across instances", async () => {
    const redis = createRedis();
    const firstInstance = new ErrorRateTracker(60_000, 2, 120_000, redis);
    const secondInstance = new ErrorRateTracker(60_000, 2, 120_000, redis);

    await firstInstance.recordError("checkout");
    await secondInstance.recordError("checkout");
    await firstInstance.recordError("checkout");
    await secondInstance.recordError("checkout");

    expect(sentryMocks.captureException).toHaveBeenCalledTimes(1);
  });

  it("ignores timestamps outside the configured window", async () => {
    const redis = createRedis();
    const tracker = new ErrorRateTracker(60_000, 10, 120_000, redis);
    await tracker.recordError("booking");
    vi.advanceTimersByTime(70_000);
    await tracker.recordError("booking");

    await expect(tracker.getErrorCount("booking")).resolves.toBe(1);
  });

  it("does not let Redis failures mask the original application failure", async () => {
    const redis = createRedis();
    redis.lpush = vi.fn().mockRejectedValue(new Error("Redis unavailable"));
    const tracker = new ErrorRateTracker(60_000, 2, 120_000, redis);

    await expect(tracker.recordError("booking")).resolves.toBeUndefined();
    expect(sentryMocks.captureException).not.toHaveBeenCalled();
  });
});
