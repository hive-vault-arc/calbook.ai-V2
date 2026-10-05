"use server";

import { createHash } from "node:crypto";
import {
  BetaInvitationService,
  betaInvitationSchema,
} from "@calcom/features/auth/beta/BetaInvitationService";
import { sendBetaInvitationEmail } from "@calcom/features/auth/beta/sendBetaInvitationEmail";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import prisma from "@calcom/prisma";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

const path = "/settings/admin/beta";

export async function requireBetaAdmin(): Promise<number> {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session?.user?.id) redirect("/auth/login");
  await new BetaInvitationService().assertAdmin(session.user.id);
  return session.user.id;
}

export async function inviteBetaApplicant(formData: FormData): Promise<void> {
  const adminId = await requireBetaAdmin();
  await checkRateLimitAndThrowError({ rateLimitingType: "core", identifier: `beta-invite:${adminId}` });
  let result = "sent";
  try {
    const input = betaInvitationSchema.parse(Object.fromEntries(formData));
    const invite = await new BetaInvitationService().issue(adminId, input);
    const tokenHash = createHash("sha256").update(invite.token).digest("hex");
    try {
      await sendBetaInvitationEmail(invite, input.accessDays);
      await prisma.betaInvitation.updateMany({
        where: { id: invite.id, tokenHash },
        data: { sentAt: new Date() },
      });
    } catch {
      // A failed delivery must not revoke a newer invitation issued concurrently.
      await prisma.betaInvitation.updateMany({
        where: { id: invite.id, tokenHash, redeemedAt: null },
        data: { revokedAt: new Date() },
      });
      result = "delivery-failed";
    }
  } catch {
    result = "invalid";
  }
  revalidatePath(path);
  redirect(`${path}?result=${result}`);
}

export async function revokeBetaInvitation(formData: FormData): Promise<void> {
  const adminId = await requireBetaAdmin();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return;
  await new BetaInvitationService().revoke(adminId, id);
  revalidatePath(path);
  redirect(`${path}?result=revoked`);
}
