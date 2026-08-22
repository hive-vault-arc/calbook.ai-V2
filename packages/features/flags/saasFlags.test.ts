import { beforeEach, describe, expect, it, vi } from "vitest";

const featureRepoMocks = vi.hoisted(() => ({
  findBySlug: vi.fn(),
}));

vi.mock("@calcom/features/di/containers/FeatureRepository", () => ({
  getFeatureRepository: () => ({
    findBySlug: featureRepoMocks.findBySlug,
  }),
}));

import { isSaaSFeatureEnabled, SAAS_FLAGS } from "./saasFlags";

describe("saasFlags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exposes the four SaaS v1 feature flag identifiers", () => {
    expect(SAAS_FLAGS.monetization).toBe("monetization-paid-bookings");
    expect(SAAS_FLAGS.tieredAvailability).toBe("tiered-availability");
    expect(SAAS_FLAGS.waitlist).toBe("waitlist");
    expect(SAAS_FLAGS.eventSubscriptions).toBe("event-subscriptions");
  });

  it("defaults to enabled when no Feature row exists", async () => {
    featureRepoMocks.findBySlug.mockResolvedValue(null);
    await expect(isSaaSFeatureEnabled(SAAS_FLAGS.waitlist)).resolves.toBe(true);
  });

  it("returns the stored value when a Feature row exists with enabled=true", async () => {
    featureRepoMocks.findBySlug.mockResolvedValue({ slug: "waitlist", enabled: true });
    await expect(isSaaSFeatureEnabled(SAAS_FLAGS.waitlist)).resolves.toBe(true);
  });

  it("returns false when a Feature row exists with enabled=false", async () => {
    featureRepoMocks.findBySlug.mockResolvedValue({ slug: "waitlist", enabled: false });
    await expect(isSaaSFeatureEnabled(SAAS_FLAGS.waitlist)).resolves.toBe(false);
  });

  it("defaults to enabled when the repository throws", async () => {
    featureRepoMocks.findBySlug.mockRejectedValue(new Error("DB unavailable"));
    await expect(isSaaSFeatureEnabled(SAAS_FLAGS.eventSubscriptions)).resolves.toBe(true);
  });
});
