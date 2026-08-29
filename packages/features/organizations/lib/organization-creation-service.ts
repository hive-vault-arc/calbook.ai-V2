import { randomUUID } from "node:crypto";
import { TRIAL_LIMIT_DAYS } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import type { PrismaClient } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";

const log = logger.getSubLogger({ prefix: ["organization", "creation-service"] });

type CreateOrganizationInput = {
  userId: number;
  name: string;
  slug: string;
  bio?: string;
  brandColor?: string;
  logoUrl?: string;
  invitedMembers?: Array<{ email: string; name?: string; role: MembershipRole }>;
  startTrial?: boolean;
};

export async function createOrganization(prisma: PrismaClient, input: CreateOrganizationInput) {
  const slug = input.slug.toLowerCase().trim();
  if (!slug) throw new Error("Organization slug is required");
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Error("Slug can only contain lowercase letters, numbers, and hyphens");
  }

  const existingMembership = await prisma.membership.findFirst({
    where: { userId: input.userId, accepted: true, team: { isOrganization: true } },
    select: { id: true },
  });
  if (existingMembership) throw new Error("User is already a member of an organization");

  const existing = await prisma.team.findFirst({
    where: { slug, isOrganization: true },
    select: { id: true },
  });
  if (existing) throw new Error(`Organization slug "${slug}" is already taken`);

  const result = await prisma.$transaction(async (tx) => {
    const organization = await tx.team.create({
      data: {
        name: input.name,
        slug,
        bio: input.bio ?? null,
        logoUrl: input.logoUrl ?? null,
        brandColor: input.brandColor ?? null,
        isOrganization: true,
        parentId: null,
      },
      select: { id: true, name: true, slug: true },
    });

    await tx.membership.create({
      data: {
        teamId: organization.id,
        userId: input.userId,
        role: MembershipRole.OWNER,
        accepted: true,
      },
    });

    await tx.organizationSettings.create({
      data: {
        organizationId: organization.id,
        orgAutoAcceptEmail: "",
        isOrganizationConfigured: true,
      },
    });

    const user = await tx.user.findUnique({
      where: { id: input.userId },
      select: { username: true },
    });
    if (!user) throw new Error(`Unable to create organization: user ${input.userId} was not found`);

    const profileUsername = user.username ?? slug;
    await tx.profile.create({
      data: {
        uid: randomUUID(),
        username: profileUsername,
        organizationId: organization.id,
        userId: input.userId,
        movedFromUser: { connect: { id: input.userId } },
      },
    });

    if (input.startTrial) {
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_LIMIT_DAYS);
      await tx.user.update({
        where: { id: input.userId },
        data: { trialEndsAt },
      });
    }

    const skippedInviteEmails: string[] = [];
    if (input.invitedMembers && input.invitedMembers.length > 0) {
      for (const member of input.invitedMembers) {
        if (member.role === MembershipRole.OWNER) {
          throw new Error("Invited members cannot be organization owners");
        }

        const existingUser = await tx.user.findFirst({
          where: { email: { equals: member.email, mode: "insensitive" } },
          select: { id: true },
        });
        if (!existingUser) {
          skippedInviteEmails.push(member.email);
          continue;
        }

        const otherOrganizationMembership = await tx.membership.findFirst({
          where: {
            userId: existingUser.id,
            accepted: true,
            team: { isOrganization: true },
          },
          select: { id: true },
        });
        if (otherOrganizationMembership) {
          skippedInviteEmails.push(member.email);
          continue;
        }

        await tx.membership.create({
          data: {
            teamId: organization.id,
            userId: existingUser.id,
            role: member.role,
            accepted: false,
          },
        });
      }
    }

    return { organization, skippedInviteEmails };
  });

  log.info(`Organization "${input.name}" (${slug}) created by user ${input.userId}`);
  return result;
}

export async function getOrganizationBySlug(
  prisma: PrismaClient,
  input: { slug: string; viewerUserId: number }
) {
  return prisma.team.findFirst({
    where: {
      slug: input.slug.toLowerCase(),
      isOrganization: true,
      members: { some: { userId: input.viewerUserId, accepted: true } },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      bio: true,
      logoUrl: true,
      isOrganization: true,
      members: {
        select: {
          id: true,
          role: true,
          accepted: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
      organizationSettings: true,
    },
  });
}

export async function checkSlugAvailability(prisma: PrismaClient, slug: string) {
  const normalized = slug.toLowerCase().trim();
  if (!normalized) return false;
  if (!/^[a-z0-9-]+$/.test(normalized)) return false;
  const existing = await prisma.team.findFirst({
    where: { slug: normalized, isOrganization: true },
    select: { id: true },
  });
  return !existing;
}

export async function inviteMember(
  prisma: PrismaClient,
  input: { organizationId: number; inviterUserId: number; email: string; name?: string; role: MembershipRole }
) {
  const membership = await prisma.membership.findFirst({
    where: { teamId: input.organizationId, userId: input.inviterUserId, role: MembershipRole.OWNER },
    select: { id: true },
  });
  if (!membership) throw new Error("Only organization owners can invite members");

  const existingUser = await prisma.user.findFirst({
    where: { email: { equals: input.email, mode: "insensitive" } },
    select: { id: true },
  });
  if (!existingUser) throw new Error(`No user found with email ${input.email}`);

  const existingMembership = await prisma.membership.findFirst({
    where: { teamId: input.organizationId, userId: existingUser.id },
    select: { id: true },
  });
  if (existingMembership) throw new Error("User is already a member of this organization");
  if (input.role === MembershipRole.OWNER) {
    throw new Error("Invited members cannot be organization owners");
  }

  const otherOrganizationMembership = await prisma.membership.findFirst({
    where: {
      userId: existingUser.id,
      accepted: true,
      team: { isOrganization: true, id: { not: input.organizationId } },
    },
    select: { id: true },
  });
  if (otherOrganizationMembership) throw new Error("User is already a member of another organization");

  return prisma.membership.create({
    data: {
      teamId: input.organizationId,
      userId: existingUser.id,
      role: input.role,
      accepted: false,
    },
    select: { id: true, role: true },
  });
}
