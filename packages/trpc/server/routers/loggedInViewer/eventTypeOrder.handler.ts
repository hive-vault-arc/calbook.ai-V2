import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { TRPCError } from "@trpc/server";
import type { TEventTypeOrderInputSchema } from "./eventTypeOrder.schema";

type EventTypeOrderOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TEventTypeOrderInputSchema;
};

export const eventTypeOrderHandler = async ({ ctx, input }: EventTypeOrderOptions) => {
  const { user } = ctx;

  const allEventTypes = await prisma.eventType.findMany({
    select: {
      id: true,
      teamId: true,
      userId: true,
    },
    where: {
      id: {
        in: input.ids,
      },
    },
  });
  const allEventTypeIds = new Set(allEventTypes.map((type) => type.id));
  if (input.ids.some((id) => !allEventTypeIds.has(id))) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
    });
  }

  const firstEventType = allEventTypes[0];
  if (!firstEventType) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "At least one event type is required." });
  }

  const teamId = firstEventType.teamId;
  if (allEventTypes.some((eventType) => eventType.teamId !== teamId)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Event types must belong to the same workspace." });
  }

  if (teamId === null) {
    if (allEventTypes.some((eventType) => eventType.userId !== user.id)) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
  } else {
    const membership = await prisma.membership.findFirst({
      where: {
        teamId,
        userId: user.id,
        accepted: true,
        role: { in: [MembershipRole.ADMIN, MembershipRole.OWNER] },
      },
      select: { id: true },
    });
    if (!membership) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
  }
  await Promise.all(
    [...input.ids].reverse().map((id, position) => {
      return prisma.eventType.update({
        where: {
          id,
        },
        data: {
          position,
        },
      });
    })
  );
};
