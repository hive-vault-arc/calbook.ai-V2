import { beforeEach, describe, expect, it, vi } from "vitest";

import { validateSubscriptionAccess } from "./RegularBookingService";

const service = {
  getEventTypeSubscriptionConfig: vi.fn(),
  checkEntitlement: vi.fn(),
};

describe("validateSubscriptionAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service.getEventTypeSubscriptionConfig.mockResolvedValue({
      requiresSubscription: true,
      subscriptionConfig: null,
    });
  });

  it("rejects anonymous direct booking calls", async () => {
    await expect(
      validateSubscriptionAccess(
        { eventTypeId: 10, bookerEmail: "booker@example.com", isReschedule: false },
        service
      )
    ).rejects.toThrow("subscription_sign_in_required");
    expect(service.checkEntitlement).not.toHaveBeenCalled();
  });

  it("rejects authenticated bookers without an active entitlement", async () => {
    service.checkEntitlement.mockResolvedValue(false);

    await expect(
      validateSubscriptionAccess(
        { eventTypeId: 10, userId: 20, bookerEmail: "booker@example.com", isReschedule: false },
        service
      )
    ).rejects.toThrow("active_subscription_required");
  });

  it("allows an authenticated booker with a matching active entitlement", async () => {
    service.checkEntitlement.mockResolvedValue(true);

    await expect(
      validateSubscriptionAccess(
        { eventTypeId: 10, userId: 20, bookerEmail: "booker@example.com", isReschedule: false },
        service
      )
    ).resolves.toBeUndefined();
    expect(service.checkEntitlement).toHaveBeenCalledWith({
      eventTypeId: 10,
      userId: 20,
      email: "booker@example.com",
    });
  });

  it("does not gate event types without subscription requirements", async () => {
    service.getEventTypeSubscriptionConfig.mockResolvedValue({
      requiresSubscription: false,
      subscriptionConfig: null,
    });

    await expect(
      validateSubscriptionAccess(
        { eventTypeId: 10, bookerEmail: "booker@example.com", isReschedule: false },
        service
      )
    ).resolves.toBeUndefined();
  });

  it("allows existing bookings to be rescheduled", async () => {
    await expect(
      validateSubscriptionAccess(
        { eventTypeId: 10, bookerEmail: "booker@example.com", isReschedule: true },
        service
      )
    ).resolves.toBeUndefined();
    expect(service.getEventTypeSubscriptionConfig).not.toHaveBeenCalled();
  });
});
