import { alertElevatedErrors } from "./monitoring";

type ErrorWindow = {
  timestamps: number[];
};

/**
 * R5.3: Lightweight sliding-window error rate tracker.
 * Tracks 5xx errors per service in memory and fires an alert when
 * the error count exceeds a threshold within the configured window.
 *
 * This is intentionally in-memory and per-instance. For multi-instance
 * deployments, a Redis-backed tracker should replace this, but the
 * interface remains the same.
 */
export class ErrorRateTracker {
  private windows = new Map<string, ErrorWindow>();
  private alertCooldowns = new Map<string, number>();

  constructor(
    private readonly windowMs: number = 5 * 60 * 1000,
    private readonly threshold: number = 10,
    private readonly cooldownMs: number = 15 * 60 * 1000
  ) {}

  /**
   * Record a 5xx error for the given service. If the error count
   * within the sliding window exceeds the threshold, an alert is fired
   * (subject to cooldown to avoid alert storms).
   */
  recordError(service: string): void {
    const now = Date.now();
    const window = this.windows.get(service) ?? { timestamps: [] };

    window.timestamps.push(now);
    window.timestamps = this.pruneOldTimestamps(window.timestamps, now);

    this.windows.set(service, window);

    if (window.timestamps.length >= this.threshold) {
      const lastAlert = this.alertCooldowns.get(service) ?? 0;
      if (now - lastAlert >= this.cooldownMs) {
        this.alertCooldowns.set(service, now);
        alertElevatedErrors({
          service,
          errorCount: window.timestamps.length,
          windowMinutes: Math.round(this.windowMs / 60_000),
          threshold: this.threshold,
        });
      }
    }
  }

  /**
   * Get the current error count for a service within the window.
   */
  getErrorCount(service: string): number {
    const window = this.windows.get(service);
    if (!window) return 0;
    return this.pruneOldTimestamps(window.timestamps, Date.now()).length;
  }

  private pruneOldTimestamps(timestamps: number[], now: number): number[] {
    const cutoff = now - this.windowMs;
    return timestamps.filter((ts) => ts > cutoff);
  }
}

/**
 * Default singleton tracker instance.
 * Window: 5 minutes, threshold: 10 errors, cooldown: 15 minutes.
 */
export const errorRateTracker = new ErrorRateTracker();
