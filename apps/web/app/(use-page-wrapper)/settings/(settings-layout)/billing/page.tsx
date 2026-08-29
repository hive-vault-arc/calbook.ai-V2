import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { BillingView } from "~/billing/BillingView";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("billing_and_plans"),
    (t) => t("billing_and_plans_description"),
    undefined,
    undefined,
    "/settings/billing"
  );

export default async function BillingPage(): Promise<JSX.Element> {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session?.user.id) redirect("/auth/login?callbackUrl=/settings/billing");

  const organizationId = session.user.profile?.organizationId ?? null;
  const billingMembership = await prisma.membership.findFirst({
    where: {
      userId: session.user.id,
      accepted: true,
      role: { in: [MembershipRole.OWNER, MembershipRole.ADMIN] },
      team: { parentId: null },
      ...(organizationId ? { teamId: organizationId } : {}),
    },
    select: {
      teamId: true,
      team: { select: { name: true } },
    },
  });

  return (
    <BillingView teamId={billingMembership?.teamId ?? null} teamName={billingMembership?.team.name ?? null} />
  );
}
