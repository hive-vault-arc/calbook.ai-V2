import { waitlistService } from "@calcom/features/bookings/lib/service/WaitlistService";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("next/server", () => ({
  NextRequest: class MockNextRequest {
    nextUrl: { searchParams: URLSearchParams };
    private readonly requestHeaders = new Map<string, string>();

    constructor(url: string) {
      this.nextUrl = { searchParams: new URLSearchParams(url.split("?")[1] || "") };
    }

    headers = {
      get: (key: string): string | null => this.requestHeaders.get(key.toLowerCase()) || null,
      set: (key: string, value: string): void => {
        this.requestHeaders.set(key.toLowerCase(), value);
      },
    };
  },
  NextResponse: {
    json: vi.fn((body, init) => ({
      json: vi.fn().mockResolvedValue(body),
      status: init?.status || 200,
    })),
  },
}));

vi.mock("@calcom/features/bookings/lib/service/WaitlistService", () => ({
  waitlistService: { recoverExpiredPromotions: vi.fn() },
}));

vi.mock("@calcom/web/app/api/defaultResponderForAppDir", () => ({
  defaultResponderForAppDir: vi.fn((handler) => handler),
}));

describe("/api/cron/waitlist-recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_API_KEY", "test-cron-key");
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
  });

  test("rejects a request without cron credentials", async () => {
    const request = new NextRequest("http://localhost/api/cron/waitlist-recovery");
    const { GET } = await import("./route");

    const response = await GET(request, { params: Promise.resolve({}) });

    expect(response.status).toBe(403);
    expect(waitlistService.recoverExpiredPromotions).not.toHaveBeenCalled();
  });

  test("does not accept placeholder credentials when cron secrets are unconfigured", async () => {
    vi.stubEnv("CRON_API_KEY", "");
    vi.stubEnv("CRON_SECRET", "");
    const request = new NextRequest("http://localhost/api/cron/waitlist-recovery");
    request.headers.set("authorization", "Bearer undefined");
    const { GET } = await import("./route");

    const response = await GET(request, { params: Promise.resolve({}) });

    expect(response.status).toBe(403);
    expect(waitlistService.recoverExpiredPromotions).not.toHaveBeenCalled();
  });

  test("runs recovery with the configured bearer secret", async () => {
    const recovery = { expired: 2, promoted: 1, failed: 0 };
    vi.mocked(waitlistService.recoverExpiredPromotions).mockResolvedValue(recovery);
    const request = new NextRequest("http://localhost/api/cron/waitlist-recovery");
    request.headers.set("authorization", "Bearer test-cron-secret");
    const { GET } = await import("./route");

    const response = await GET(request, { params: Promise.resolve({}) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, recovery });
    expect(waitlistService.recoverExpiredPromotions).toHaveBeenCalledOnce();
  });

  test("accepts the configured API key as a query parameter", async () => {
    vi.mocked(waitlistService.recoverExpiredPromotions).mockResolvedValue({
      expired: 0,
      promoted: 0,
      failed: 0,
    });
    const request = new NextRequest("http://localhost/api/cron/waitlist-recovery?apiKey=test-cron-key");
    const { GET } = await import("./route");

    const response = await GET(request, { params: Promise.resolve({}) });

    expect(response.status).toBe(200);
    expect(waitlistService.recoverExpiredPromotions).toHaveBeenCalledOnce();
  });
});
