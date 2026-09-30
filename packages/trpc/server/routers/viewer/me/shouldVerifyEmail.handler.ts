import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

type ShouldVerifyEmailType = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const shouldVerifyEmailHandler = async ({ ctx }: ShouldVerifyEmailType) => {
  const { user } = ctx;
  const currentUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      email: true,
      emailVerified: true,
      identityProvider: true,
    },
  });

  const isVerified = Boolean(currentUser?.emailVerified);
  const isCalProvider = (currentUser?.identityProvider ?? user.identityProvider) === "CAL";

  const obj = {
    id: user.id,
    email: currentUser?.email ?? user.email,
    isVerified: isVerified || !isCalProvider,
  };

  return obj;
};
