import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultVideoLocation } from "../getDefaultVideoLocation";
import { scheduleNoShowTriggers } from "./scheduleNoShowTriggers";

vi.mock("../getDefaultVideoLocation", () => ({ getDefaultVideoLocation: vi.fn() }));
vi.mock("@calcom/features/webhooks/lib/getWebhooks", () => ({ default: vi.fn() }));
vi.mock("@calcom/features/tasker", () => ({ default: { create: vi.fn() } }));
vi.mock("@calcom/lib/sentryWrapper", () => ({ withReporting: <T>(fn: T) => fn }));

describe("scheduleNoShowTriggers video availability", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getWebhooks).mockResolvedValue([]);
  });

  const args = {
    booking: { startTime: new Date("2026-10-16T10:00:00Z"), id: 1, uid: "test", location: "" },
    organizerUser: { id: 1 },
    eventTypeId: 1,
  };

  it("does not schedule Cal Video work for an unconfigured empty location", async () => {
    vi.mocked(getDefaultVideoLocation).mockResolvedValue("");
    await scheduleNoShowTriggers(args);
    expect(getWebhooks).not.toHaveBeenCalled();
  });

  it("preserves the configured legacy empty-location fallback", async () => {
    vi.mocked(getDefaultVideoLocation).mockResolvedValue("integrations:daily");
    await scheduleNoShowTriggers(args);
    expect(getWebhooks).toHaveBeenCalledTimes(2);
  });

  it("preserves explicitly selected Cal Video without another availability lookup", async () => {
    await scheduleNoShowTriggers({ ...args, booking: { ...args.booking, location: "integrations:daily" } });
    expect(getDefaultVideoLocation).not.toHaveBeenCalled();
    expect(getWebhooks).toHaveBeenCalledTimes(2);
  });

  it("does not perform provider or webhook lookups for a dry run", async () => {
    await scheduleNoShowTriggers({ ...args, isDryRun: true });
    expect(getDefaultVideoLocation).not.toHaveBeenCalled();
    expect(getWebhooks).not.toHaveBeenCalled();
  });
});
