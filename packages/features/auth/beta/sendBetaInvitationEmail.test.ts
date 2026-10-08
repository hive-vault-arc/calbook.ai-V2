// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ sendMail: vi.fn(), disabled: vi.fn() }));
vi.mock("nodemailer", () => ({ createTransport: () => ({ sendMail: mocks.sendMail }) }));
vi.mock("@calcom/features/flags/features.repository", () => ({
  FeaturesRepository: class {
    checkIfFeatureIsEnabledGlobally = mocks.disabled;
  },
}));
vi.mock("@calcom/prisma", () => ({ default: {} }));
vi.mock("@calcom/lib/constants", () => ({ WEBAPP_URL: "https://beta.example.test" }));
vi.mock("@calcom/lib/serverConfig", () => ({
  serverConfig: { from: "CalBook <hello@example.test>", transport: {} },
}));
vi.mock("@calcom/i18n/server", () => ({
  getTranslation: vi.fn().mockResolvedValue((key: string, data?: { url: string }) => data?.url ?? key),
}));

import { sendBetaInvitationEmail } from "./sendBetaInvitationEmail";

const invitation = {
  email: "accepted@example.test",
  token: "a".repeat(64),
  expiresAt: new Date("2026-11-01"),
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.disabled.mockResolvedValue(false);
  mocks.sendMail.mockResolvedValue({});
});

it("sends only to the approved email using the configured app origin", async () => {
  await sendBetaInvitationEmail(invitation, 90);
  expect(mocks.sendMail).toHaveBeenCalledWith(
    expect.objectContaining({
      to: invitation.email,
      text: `https://beta.example.test/signup?betaToken=${invitation.token}`,
    })
  );
});

it("propagates delivery failures rather than reporting success", async () => {
  mocks.sendMail.mockRejectedValue(new Error("SMTP unavailable"));
  await expect(sendBetaInvitationEmail(invitation, 90)).rejects.toThrow("SMTP unavailable");
});

it("respects the email kill switch", async () => {
  mocks.disabled.mockResolvedValue(true);
  await expect(sendBetaInvitationEmail(invitation, 90)).rejects.toThrow("disabled");
  expect(mocks.sendMail).not.toHaveBeenCalled();
});
