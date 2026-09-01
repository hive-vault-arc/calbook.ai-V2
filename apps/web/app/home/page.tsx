import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma from "@calcom/prisma";
import { userMetadata } from "@calcom/prisma/zod-utils";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactElement } from "react";
import { RecruitingDashboard } from "~/home/RecruitingDashboard";

export default async function HomePage(): Promise<ReactElement> {
  const session = await getServerSession({
    req: buildLegacyRequest(await headers(), await cookies()),
  });
  if (!session?.user?.id) redirect("/auth/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { metadata: true },
  });
  const metadata = userMetadata.parse(user?.metadata ?? null);
  const workspaceType = metadata?.workspaceType ?? "recruiting";

  return (
    <RecruitingDashboard
      userName={session.user.name ?? session.user.email ?? ""}
      workspaceType={workspaceType}
    />
  );
}
