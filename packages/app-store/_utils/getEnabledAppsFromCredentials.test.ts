import { prisma } from "@calcom/prisma/__mocks__/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import dailyMetadata from "../dailyvideo/_metadata";
import getApps from "../utils";
import getEnabledAppsFromCredentials from "./getEnabledAppsFromCredentials";

vi.mock("@calcom/prisma", () => ({ prisma }));
vi.mock("../utils", () => ({ default: vi.fn() }));

describe("configured global video availability", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prisma.app.findMany.mockResolvedValue([]);
    vi.mocked(getApps).mockReturnValue([
      {
        ...dailyMetadata,
        credential: {
          id: 0,
          type: "daily_video",
          key: {},
          encryptedKey: null,
          userId: 0,
          user: { email: "" },
          teamId: null,
          appId: "daily-video",
          invalid: false,
          delegatedTo: null,
          delegationCredentialId: null,
        },
        credentials: [],
        locationOption: null,
      },
    ]);
  });

  it("hides a global Cal Video entry missing from the instance", async () => {
    prisma.app.findUnique.mockResolvedValue(null);
    expect(await getEnabledAppsFromCredentials([], { filterOnCredentials: true })).toEqual([]);
  });

  it.each([
    { enabled: false, keys: { api_key: "test-key" }, visible: false },
    { enabled: true, keys: null, visible: false },
    { enabled: true, keys: { api_key: "   " }, visible: false },
    { enabled: true, keys: { api_key: "test-key" }, visible: true },
  ])("only shows usable Cal Video: %j", async ({ enabled, keys, visible }) => {
    prisma.app.findUnique.mockResolvedValue({
      slug: "daily-video",
      dirName: "dailyvideo",
      enabled,
      keys,
      categories: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const apps = await getEnabledAppsFromCredentials([], { filterOnCredentials: true });
    expect(apps.map((app) => app.slug)).toEqual(visible ? ["daily-video"] : []);
  });

  it("does not look up Daily when it is not among the candidate apps", async () => {
    vi.mocked(getApps).mockReturnValue([]);
    expect(await getEnabledAppsFromCredentials([])).toEqual([]);
    expect(prisma.app.findUnique).not.toHaveBeenCalled();
  });

  it("preserves the behavior of other global apps", async () => {
    const [app] = getApps([]);
    vi.mocked(getApps).mockReturnValue([{ ...app, slug: "another-global-app" }]);
    const apps = await getEnabledAppsFromCredentials([]);
    expect(apps.map((item) => item.slug)).toEqual(["another-global-app"]);
    expect(prisma.app.findUnique).not.toHaveBeenCalled();
  });
});
