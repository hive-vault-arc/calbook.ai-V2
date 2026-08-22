import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sentryMocks = vi.hoisted(() => ({
  captureException: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: sentryMocks.captureException,
}));

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

import { ErrorRateTracker } from "./errorRateTracker";

describe("ErrorRateTracker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not alert below the threshold", () => {
    const tracker = new ErrorRateTracker(60_000, 5, 120_000);
    for (let i = 0; i < 4; i++) {
      tracker.recordError("test-service");
    }
    expect(sentryMocks.captureException).not.toHaveBeenCalled();
    expect(tracker.getErrorCount("test-service")).toBe(4);
  });

  it("alerts when the threshold is reached", () => {
    const tracker = new ErrorRateTracker(60_000, 3, 120_000);
    tracker.recordError("webhook");
    tracker.recordError("webhook");
    tracker.recordError("webhook");
    expect(sentryMocks.captureException).toHaveBeenCalledTimes(1);
  });

  it("does not fire duplicate alerts during cooldown", () => {
    const tracker = new ErrorRateTracker(60_000, 2, 120_000);
    tracker.recordError("checkout");
    tracker.recordError("checkout");
    expect(sentryMocks.captureException).toHaveBeenCalledTimes(1);
    tracker.recordError("checkout");
    tracker.recordError("checkout");
    expect(sentryMocks.captureException).toHaveBeenCalledTimes(1);
  });

  it("prunes old timestamps outside the window", () => {
    const tracker = new ErrorRateTracker(60_000, 10, 120_000);
    tracker.recordError("booking");
    vi.advanceTimersByTime(70_000);
    tracker.recordError("booking");
    expect(tracker.getErrorCount("booking")).toBe(1);
  });

  it("returns zero for unknown services", () => {
    const tracker = new ErrorRateTracker();
    expect(tracker.getErrorCount("nonexistent")).toBe(0);
  });
});
