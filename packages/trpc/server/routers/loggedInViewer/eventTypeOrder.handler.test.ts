import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { describe, expect, it, vi } from "vitest";

const { mockFindMany, mockUpdate, mockFindFirst } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockUpdate: vi.fn(),
  mockFindFirst: vi.fn(),
}));

vi.mock("@calcom/prisma", () => ({
  prisma: {
    eventType: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
    membership: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
    },
  },
}));

import { eventTypeOrderHandler } from "./eventTypeOrder.handler";
import { ZEventTypeOrderInputSchema } from "./eventTypeOrder.schema";

const ctx = {
  user: { id: 1 } as NonNullable<TrpcSessionUser>,
};

describe("eventTypeOrderHandler", () => {
  it("requires a non-empty list of unique event type IDs", () => {
    expect(ZEventTypeOrderInputSchema.safeParse({ ids: [] }).success).toBe(false);
    expect(ZEventTypeOrderInputSchema.safeParse({ ids: [1, 1] }).success).toBe(false);
  });

  it("only reorders a user's own personal event types", async () => {
    mockFindMany.mockResolvedValue([
      { id: 1, teamId: null, userId: 1 },
      { id: 2, teamId: null, userId: 1 },
    ]);
    mockUpdate.mockResolvedValue({});

    await eventTypeOrderHandler({ ctx, input: { ids: [1, 2] } });

    expect(mockFindFirst).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenNthCalledWith(1, {
      where: { id: 2 },
      data: { position: 0 },
    });
    expect(mockUpdate).toHaveBeenNthCalledWith(2, {
      where: { id: 1 },
      data: { position: 1 },
    });
  });

  it("rejects event types from different workspaces", async () => {
    mockFindMany.mockResolvedValue([
      { id: 1, teamId: null, userId: 1 },
      { id: 2, teamId: 2, userId: null },
    ]);

    await expect(eventTypeOrderHandler({ ctx, input: { ids: [1, 2] } })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("requires an admin or owner membership for team event types", async () => {
    mockFindMany.mockResolvedValue([{ id: 1, teamId: 2, userId: null }]);
    mockFindFirst.mockResolvedValue(null);

    await expect(eventTypeOrderHandler({ ctx, input: { ids: [1] } })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: {
        teamId: 2,
        userId: 1,
        accepted: true,
        role: { in: [MembershipRole.ADMIN, MembershipRole.OWNER] },
      },
      select: { id: true },
    });
  });
});
