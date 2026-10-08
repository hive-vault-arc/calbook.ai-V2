// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ inspect: vi.fn(), redeem: vi.fn(), disabled: vi.fn(), reserved: vi.fn() }));
vi.mock("@calcom/features/auth/beta/BetaInvitationService", () => ({
  BetaInvitationService: class {
    inspect = mocks.inspect;
    redeem = mocks.redeem;
  },
}));
vi.mock("@calcom/features/flags/features.repository", () => ({
  FeaturesRepository: class {
    checkIfFeatureIsEnabledGlobally = mocks.disabled;
  },
}));
vi.mock("@calcom/prisma", () => ({ default: {} }));
vi.mock("@calcom/lib/server/username", () => ({ isUsernameReservedDueToMigration: mocks.reserved }));
vi.mock("@calcom/lib/auth/hashPassword", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed-password"),
}));
vi.mock("@calcom/i18n/server", () => ({ getTranslation: vi.fn().mockResolvedValue((key: string) => key) }));

import { betaSignupHandler } from "./betaSignupHandler";

const body = {
  email: "accepted@example.com",
  username: "accepted-recruiter",
  password: "BetaPassword123!",
  workspaceType: "recruiting",
  betaToken: "a".repeat(64),
};

describe("beta signup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.disabled.mockResolvedValue(false);
    mocks.reserved.mockResolvedValue(false);
    mocks.inspect.mockResolvedValue({ email: body.email, cohort: "private-beta", accessDays: 90 });
    mocks.redeem.mockResolvedValue(undefined);
  });

  it("creates an accepted account without trusting client roles or payment fields", async () => {
    const response = await betaSignupHandler({ ...body, role: "ADMIN", plan: "enterprise" });
    expect(response.status).toBe(201);
    expect(mocks.redeem).toHaveBeenCalledWith({
      token: body.betaToken,
      email: body.email,
      username: body.username,
      hashedPassword: "hashed-password",
      workspaceType: "recruiting",
      scheduleName: "default_schedule_name",
    });
  });

  it.each([
    { ...body, betaToken: "fake" },
    { ...body, workspaceType: "" },
    { ...body, password: "weak" },
    { ...body, token: "team-invitation-too" },
  ])("rejects invalid or mixed signup payloads", async (input) => {
    const response = await betaSignupHandler(input);
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(mocks.redeem).not.toHaveBeenCalled();
  });

  it("rejects an uninvited email even when it knows a valid token", async () => {
    expect((await betaSignupHandler({ ...body, email: "someone-else@example.com" })).status).toBe(403);
    expect(mocks.redeem).not.toHaveBeenCalled();
  });

  it("respects the global signup emergency switch", async () => {
    mocks.disabled.mockResolvedValue(true);
    expect((await betaSignupHandler(body)).status).toBe(403);
    expect(mocks.redeem).not.toHaveBeenCalled();
  });

  it("rejects expired tokens and reserved usernames", async () => {
    mocks.inspect.mockResolvedValue(null);
    expect((await betaSignupHandler(body)).status).toBe(403);
    mocks.reserved.mockResolvedValue(true);
    expect((await betaSignupHandler(body)).status).toBe(400);
    expect(mocks.redeem).not.toHaveBeenCalled();
  });
});
