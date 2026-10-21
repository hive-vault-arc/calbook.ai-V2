import { prisma } from "@calcom/prisma/__mocks__/prisma";
import googleCalendarMetadata from "@calcom/app-store/googlecalendar/_metadata";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { isGoogleCalendarAvailable } from "./isGoogleCalendarAvailable";

vi.mock("@calcom/prisma", () => ({ prisma }));
vi.mock("@calcom/app-store/googlecalendar/_metadata", () => ({ default: { installed: true } }));

describe("isGoogleCalendarAvailable", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    googleCalendarMetadata.installed = true;
  });

  it("does not advertise missing OAuth setup", async () => {
    googleCalendarMetadata.installed = false;
    expect(await isGoogleCalendarAvailable()).toBe(false);
    expect(prisma.app.findUnique).not.toHaveBeenCalled();
  });

  it("does not advertise an app absent from the instance", async () => {
    prisma.app.findUnique.mockResolvedValue(null);
    expect(await isGoogleCalendarAvailable()).toBe(false);
  });

  it.each([false, true])("requires the instance enabled flag: %s", async (enabled) => {
    prisma.app.findUnique.mockResolvedValue({
      slug: "google-calendar",
      dirName: "googlecalendar",
      enabled,
      keys: null,
      categories: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(await isGoogleCalendarAvailable()).toBe(enabled);
    expect(prisma.app.findUnique).toHaveBeenCalledWith({
      where: { slug: "google-calendar" },
      select: { enabled: true },
    });
  });
});
