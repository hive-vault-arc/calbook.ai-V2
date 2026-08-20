import {
  checkSlugAvailability,
  createOrganization,
  getOrganizationBySlug,
  inviteMember,
} from "@calcom/features/organizations/lib/organization-creation-service";
import { MembershipRole } from "@calcom/prisma/enums";
import { z } from "zod";
import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";

export const organizationsRouter = router({
  checkSlug: authedProcedure
    .input(z.object({ slug: z.string().min(2).max(50) }))
    .query(({ ctx, input }) => checkSlugAvailability(ctx.prisma, input.slug)),

  create: authedProcedure
    .input(
      z.object({
        name: z.string().min(2).max(100),
        slug: z
          .string()
          .min(2)
          .max(50)
          .regex(/^[a-zA-Z0-9-]+$/, "Only letters, numbers, and hyphens"),
        bio: z.string().max(500).optional(),
        brandColor: z.string().optional(),
        logoUrl: z.string().url().optional(),
        startTrial: z.boolean().default(true),
        invitedMembers: z
          .array(
            z.object({
              email: z.string().email(),
              name: z.string().optional(),
              role: z.enum([MembershipRole.MEMBER, MembershipRole.ADMIN]).default(MembershipRole.MEMBER),
            })
          )
          .default([]),
      })
    )
    .mutation(({ ctx, input }) => createOrganization(ctx.prisma, { userId: ctx.user.id, ...input })),

  getBySlug: authedProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ ctx, input }) =>
      getOrganizationBySlug(ctx.prisma, { slug: input.slug, viewerUserId: ctx.user.id })
    ),

  invite: authedProcedure
    .input(
      z.object({
        organizationId: z.number().int().positive(),
        email: z.string().email(),
        name: z.string().optional(),
        role: z.enum([MembershipRole.MEMBER, MembershipRole.ADMIN]).default(MembershipRole.MEMBER),
      })
    )
    .mutation(({ ctx, input }) =>
      inviteMember(ctx.prisma, {
        organizationId: input.organizationId,
        inviterUserId: ctx.user.id,
        email: input.email,
        name: input.name,
        role: input.role,
      })
    ),
});
