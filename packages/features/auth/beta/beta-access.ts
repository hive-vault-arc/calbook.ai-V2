import prisma from "@calcom/prisma";

export async function getTeamBetaAccess(teamId: number) {
  return prisma.betaAccessGrant.findFirst({
    where: {
      revokedAt: null,
      expiresAt: { gt: new Date() },
      invitation: { revokedAt: null },
      // Ownership carries beta access into workspaces created during onboarding.
      user: { locked: false, teams: { some: { teamId, role: "OWNER", accepted: true } } },
    },
    orderBy: { expiresAt: "desc" },
    select: { expiresAt: true, invitation: { select: { cohort: true } } },
  });
}
