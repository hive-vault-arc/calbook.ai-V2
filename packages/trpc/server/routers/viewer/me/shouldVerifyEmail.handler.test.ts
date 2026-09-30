import { IdentityProvider } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcSessionUser } from "../../../types";

const { mockFindUnique } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
}));

vi.mock("@calcom/prisma", () => ({
  default: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}));

import { shouldVerifyEmailHandler } from "./shouldVerifyEmail.handler";

const createUser = (overrides: Partial<NonNullable<TrpcSessionUser>> = {}) =>
  ({
    id: 7,
    email: "recruiter@example.com",
    emailVerified: null,
    identityProvider: IdentityProvider.CAL,
    ...overrides,
  }) as NonNullable<TrpcSessionUser>;

describe("shouldVerifyEmailHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads the latest verification state instead of the stale session snapshot", async () => {
    const verifiedAt = new Date();
    mockFindUnique.mockResolvedValue({
      email: "recruiter@example.com",
      emailVerified: verifiedAt,
      identityProvider: IdentityProvider.CAL,
    });

    const result = await shouldVerifyEmailHandler({ ctx: { user: createUser() } });

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: 7 },
      select: {
        email: true,
        emailVerified: true,
        identityProvider: true,
      },
    });
    expect(result.isVerified).toBe(true);
  });

  it("keeps an unverified credentials account on the verification screen", async () => {
    mockFindUnique.mockResolvedValue({
      email: "recruiter@example.com",
      emailVerified: null,
      identityProvider: IdentityProvider.CAL,
    });

    const result = await shouldVerifyEmailHandler({ ctx: { user: createUser() } });

    expect(result.isVerified).toBe(false);
  });

  it("treats OAuth accounts as verified", async () => {
    mockFindUnique.mockResolvedValue({
      email: "recruiter@example.com",
      emailVerified: null,
      identityProvider: IdentityProvider.GOOGLE,
    });

    const result = await shouldVerifyEmailHandler({
      ctx: { user: createUser({ identityProvider: IdentityProvider.GOOGLE }) },
    });

    expect(result.isVerified).toBe(true);
  });
});
