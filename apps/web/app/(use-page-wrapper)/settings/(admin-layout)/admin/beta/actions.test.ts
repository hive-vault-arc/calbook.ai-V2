// @vitest-environment node
import { createHash } from "node:crypto";
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  admin: vi.fn(),
  issue: vi.fn(),
  revoke: vi.fn(),
  send: vi.fn(),
  update: vi.fn(),
  rateLimit: vi.fn(),
}));
vi.mock("@calcom/features/auth/beta/BetaInvitationService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@calcom/features/auth/beta/BetaInvitationService")>();
  return {
    ...actual,
    BetaInvitationService: class {
      assertAdmin = mocks.admin;
      issue = mocks.issue;
      revoke = mocks.revoke;
    },
  };
});
vi.mock("@calcom/features/auth/beta/sendBetaInvitationEmail", () => ({
  sendBetaInvitationEmail: mocks.send,
}));
vi.mock("@calcom/features/auth/lib/getServerSession", () => ({ getServerSession: mocks.session }));
vi.mock("@calcom/lib/checkRateLimitAndThrowError", () => ({ checkRateLimitAndThrowError: mocks.rateLimit }));
vi.mock("@calcom/prisma", () => ({ default: { betaInvitation: { updateMany: mocks.update } } }));
vi.mock("@lib/buildLegacyCtx", () => ({ buildLegacyRequest: vi.fn() }));
vi.mock("next/headers", () => ({ headers: vi.fn(), cookies: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));

import { inviteBetaApplicant, revokeBetaInvitation } from "./actions";

const token = "a".repeat(64);
const tokenHash = createHash("sha256").update(token).digest("hex");
const form = (): FormData => {
  const data = new FormData();
  data.set("email", "accepted@example.test");
  data.set("cohort", "private-beta");
  data.set("accessDays", "90");
  return data;
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.session.mockResolvedValue({ user: { id: 1 } });
  mocks.issue.mockResolvedValue({
    id: "invite",
    token,
    email: "accepted@example.test",
    expiresAt: new Date(),
  });
  mocks.update.mockResolvedValue({ count: 1 });
});

it("requires a fresh admin check before sending or revoking", async () => {
  mocks.admin.mockRejectedValue(new Error("Forbidden"));
  await expect(inviteBetaApplicant(form())).rejects.toThrow("Forbidden");
  await expect(revokeBetaInvitation(form())).rejects.toThrow("Forbidden");
  expect(mocks.send).not.toHaveBeenCalled();
  expect(mocks.revoke).not.toHaveBeenCalled();
  expect(mocks.issue).not.toHaveBeenCalled();
  expect(mocks.update).not.toHaveBeenCalled();
});

it.each([
  null,
  {},
  { user: {} },
])("rejects missing session identity before any side effects (%j)", async (session) => {
  mocks.session.mockResolvedValue(session);
  await expect(inviteBetaApplicant(form())).rejects.toThrow("redirect:/auth/login");
  const revokeForm = new FormData();
  revokeForm.set("id", "existing-invitation");
  await expect(revokeBetaInvitation(revokeForm)).rejects.toThrow("redirect:/auth/login");
  expect(mocks.admin).not.toHaveBeenCalled();
  expect(mocks.rateLimit).not.toHaveBeenCalled();
  expect(mocks.issue).not.toHaveBeenCalled();
  expect(mocks.send).not.toHaveBeenCalled();
  expect(mocks.revoke).not.toHaveBeenCalled();
  expect(mocks.update).not.toHaveBeenCalled();
});

it("checks the session user instead of an administrator supplied in the form", async () => {
  mocks.session.mockResolvedValue({ user: { id: 42 } });
  mocks.admin.mockRejectedValue(new Error("Forbidden"));
  const input = form();
  input.set("adminId", "1");
  input.set("role", "ADMIN");
  await expect(inviteBetaApplicant(input)).rejects.toThrow("Forbidden");
  expect(mocks.admin).toHaveBeenCalledExactlyOnceWith(42);
  expect(mocks.issue).not.toHaveBeenCalled();
  expect(mocks.send).not.toHaveBeenCalled();
});

it("rechecks admin authorization on every request", async () => {
  await expect(inviteBetaApplicant(form())).rejects.toThrow("?result=sent");
  mocks.admin.mockRejectedValueOnce(new Error("Forbidden"));
  const revokeForm = new FormData();
  revokeForm.set("id", "existing-invitation");
  await expect(revokeBetaInvitation(revokeForm)).rejects.toThrow("Forbidden");
  expect(mocks.admin).toHaveBeenCalledTimes(2);
  expect(mocks.revoke).not.toHaveBeenCalled();
});

it("rate limits admin invitations before issuing tokens", async () => {
  mocks.rateLimit.mockRejectedValue(new Error("Too many requests"));
  await expect(inviteBetaApplicant(form())).rejects.toThrow("Too many requests");
  expect(mocks.issue).not.toHaveBeenCalled();
});

it("marks only the emailed token generation as sent", async () => {
  await expect(inviteBetaApplicant(form())).rejects.toThrow("?result=sent");
  expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ token }), 90);
  expect(mocks.update).toHaveBeenCalledWith({
    where: { id: "invite", tokenHash },
    data: { sentAt: expect.any(Date) },
  });
});

it("revokes only the failed generation, never a replacement or redeemed invitation", async () => {
  mocks.send.mockRejectedValue(new Error("SMTP unavailable"));
  await expect(inviteBetaApplicant(form())).rejects.toThrow("?result=delivery-failed");
  expect(mocks.update).toHaveBeenCalledExactlyOnceWith({
    where: { id: "invite", tokenHash, redeemedAt: null },
    data: { revokedAt: expect.any(Date) },
  });
});

it("rejects invalid access duration without sending an email", async () => {
  const data = form();
  data.set("accessDays", "9999");
  await expect(inviteBetaApplicant(data)).rejects.toThrow("?result=invalid");
  expect(mocks.send).not.toHaveBeenCalled();
});
