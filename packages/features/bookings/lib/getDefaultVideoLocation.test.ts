import { prisma } from "@calcom/prisma/__mocks__/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultVideoLocation } from "./getDefaultVideoLocation";

vi.mock("@calcom/prisma", () => ({ prisma }));

describe("getDefaultVideoLocation", () => {
  beforeEach(() => vi.resetAllMocks());

  it("does not invent a video provider when the app is missing", async () => {
    prisma.app.findUnique.mockResolvedValue(null);
    expect(await getDefaultVideoLocation()).toBe("");
    expect(prisma.app.findUnique).toHaveBeenCalledWith({
      where: { slug: "daily-video" },
      select: { enabled: true, keys: true },
    });
  });

  it.each([
    { enabled: false, keys: { api_key: "test-key" } },
    { enabled: true, keys: null },
    { enabled: true, keys: {} },
    { enabled: true, keys: { api_key: "" } },
    { enabled: true, keys: { api_key: "   " } },
  ])("does not use an unconfigured or disabled app: %j", async ({ enabled, keys }) => {
    prisma.app.findUnique.mockResolvedValue({
      slug: "daily-video",
      dirName: "dailyvideo",
      categories: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      enabled,
      keys,
    });
    expect(await getDefaultVideoLocation()).toBe("");
  });

  it("preserves configured Cal Video deployments", async () => {
    prisma.app.findUnique.mockResolvedValue({
      slug: "daily-video",
      dirName: "dailyvideo",
      categories: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      enabled: true,
      keys: { api_key: "test-key" },
    });
    expect(await getDefaultVideoLocation()).toBe("integrations:daily");
  });
});
