import { createHash, randomBytes } from "node:crypto";
import { DEFAULT_SCHEDULE, getAvailabilityFromSchedule } from "@calcom/lib/availability";
import { emailSchema } from "@calcom/lib/emailSchema";
import { ErrorWithCode } from "@calcom/lib/errors";
import type { PrismaClient } from "@calcom/prisma";
import prisma from "@calcom/prisma";
import { z } from "zod";

const DAY = 86_400_000;
const tokenSchema = z.string().regex(/^[a-f0-9]{64}$/);
const hashToken = (token: string): string => createHash("sha256").update(token).digest("hex");
const invalidInvite = (): ErrorWithCode =>
  ErrorWithCode.Factory.Forbidden("This beta invitation is invalid or expired");

export const betaInvitationSchema = z.object({
  email: emailSchema.transform((email) => email.toLowerCase()),
  cohort: z.string().trim().min(1).max(60).default("private-beta"),
  accessDays: z.coerce.number().int().min(1).max(365).default(90),
});

export class BetaInvitationService {
  constructor(private readonly db: PrismaClient = prisma) {}

  async assertAdmin(userId: number): Promise<void> {
    const admin = await this.db.user.findFirst({
      where: { id: userId, role: "ADMIN", locked: false },
      select: { id: true },
    });
    if (!admin) throw ErrorWithCode.Factory.Forbidden("Administrator access required");
  }

  async issue(adminId: number, input: z.input<typeof betaInvitationSchema>) {
    await this.assertAdmin(adminId);
    const { email, cohort, accessDays } = betaInvitationSchema.parse(input);
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * DAY);
    const invitation = await this.db.$transaction(
      async (tx) => {
        const [user, existing] = await Promise.all([
          tx.user.findFirst({
            where: { email: { equals: email, mode: "insensitive" } },
            select: { id: true },
          }),
          tx.betaInvitation.findUnique({ where: { email }, select: { redeemedAt: true } }),
        ]);
        if (user || existing?.redeemedAt) {
          throw ErrorWithCode.Factory.BadRequest(
            "This email already has an account or a redeemed invitation"
          );
        }
        const data = {
          email,
          cohort,
          accessDays,
          tokenHash: hashToken(token),
          expiresAt,
          invitedById: adminId,
        };
        return tx.betaInvitation.upsert({
          where: { email },
          create: data,
          update: { ...data, revokedAt: null, sentAt: null },
          select: { id: true, email: true, expiresAt: true },
        });
      },
      { isolationLevel: "Serializable" }
    );
    return { ...invitation, token };
  }

  async inspect(token: string) {
    if (!tokenSchema.safeParse(token).success) return null;
    return this.db.betaInvitation.findFirst({
      where: {
        tokenHash: hashToken(token),
        revokedAt: null,
        redeemedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { email: true, cohort: true, accessDays: true },
    });
  }

  async revoke(adminId: number, id: string): Promise<void> {
    await this.assertAdmin(adminId);
    const revokedAt = new Date();
    await this.db.$transaction(async (tx) => {
      await tx.betaInvitation.update({ where: { id }, data: { revokedAt }, select: { id: true } });
      await tx.betaAccessGrant.updateMany({ where: { invitationId: id }, data: { revokedAt } });
    });
  }

  async redeem(input: {
    token: string;
    email: string;
    username: string;
    hashedPassword: string;
    workspaceType: "recruiting" | "scheduling";
    scheduleName: string;
  }): Promise<void> {
    if (!tokenSchema.safeParse(input.token).success) throw invalidInvite();
    const email = emailSchema.parse(input.email).toLowerCase();
    const tokenHash = hashToken(input.token);
    const now = new Date();
    await this.db.$transaction(
      async (tx) => {
        // Claim and account creation share a transaction so failures leave the invitation usable.
        const claimed = await tx.betaInvitation.updateMany({
          where: { tokenHash, email, revokedAt: null, redeemedAt: null, expiresAt: { gt: now } },
          data: { redeemedAt: now },
        });
        if (claimed.count !== 1) throw invalidInvite();
        const invite = await tx.betaInvitation.findUniqueOrThrow({
          where: { tokenHash },
          select: { id: true, accessDays: true },
        });
        const existing = await tx.user.findFirst({
          where: {
            OR: [
              { email: { equals: email, mode: "insensitive" } },
              { username: input.username, organizationId: null },
            ],
          },
          select: { id: true },
        });
        if (existing) throw ErrorWithCode.Factory.BadRequest("Username or email is already taken");
        const availability = getAvailabilityFromSchedule(DEFAULT_SCHEDULE);
        await tx.user.create({
          data: {
            email,
            username: input.username,
            emailVerified: now,
            password: { create: { hash: input.hashedPassword } },
            metadata: { workspaceType: input.workspaceType },
            identityProvider: "CAL",
            creationSource: "WEBAPP",
            role: "USER",
            schedules: {
              create: {
                name: input.scheduleName,
                availability: {
                  createMany: {
                    data: availability.map(({ days, startTime, endTime }) => ({ days, startTime, endTime })),
                  },
                },
              },
            },
            betaAccess: {
              create: {
                invitationId: invite.id,
                startsAt: now,
                expiresAt: new Date(now.getTime() + invite.accessDays * DAY),
              },
            },
          },
          select: { id: true },
        });
      },
      { isolationLevel: "Serializable" }
    );
  }
}
