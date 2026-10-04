// @vitest-environment node
import { createHash, randomBytes } from "node:crypto";
import process from "node:process";
import prisma from "@calcom/prisma";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { BetaInvitationService } from "./BetaInvitationService";
import { getTeamBetaAccess } from "./beta-access";

const enabled = process.env.BETA_INTEGRATION_TESTS === "1";
const prefix = `beta-test-${randomBytes(6).toString("hex")}`;
const service = new BetaInvitationService();
let adminId: number;
let ordinaryId: number;
const emails: string[] = [];
const teamIds: number[] = [];
const email = (): string => {
  const value = `${prefix}-${emails.length}@example.test`;
  emails.push(value);
  return value;
};

describe.skipIf(!enabled)("beta invitations on isolated Postgres", () => {
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL ?? "");
    if (url.hostname !== "localhost" || url.port !== "5433" || url.pathname !== "/tests") {
      throw new Error("Beta integration tests require the isolated localhost:5433/tests database");
    }
    adminId = (await prisma.user.create({ data: { email: email(), role: "ADMIN" }, select: { id: true } }))
      .id;
    ordinaryId = (await prisma.user.create({ data: { email: email() }, select: { id: true } })).id;
  });

  afterAll(async () => {
    if (!adminId) return;
    await prisma.team.deleteMany({ where: { id: { in: teamIds } } });
    await prisma.user.deleteMany({ where: { email: { in: emails }, id: { not: adminId } } });
    await prisma.betaInvitation.deleteMany({ where: { email: { in: emails }, invitedById: adminId } });
    await prisma.user.delete({ where: { id: adminId } });
    await prisma.$disconnect();
  });

  const redeem = (invite: { token: string; email: string }, username = `${prefix}-${emails.length}`) =>
    service.redeem({
      ...invite,
      username,
      hashedPassword: "test-hash",
      workspaceType: "recruiting",
      scheduleName: "Test availability",
    });

  it("requires a current, unlocked administrator to approve or revoke", async () => {
    await expect(service.issue(ordinaryId, { email: email() })).rejects.toThrow("Administrator");
    await expect(service.revoke(ordinaryId, "fake")).rejects.toThrow("Administrator");
    await prisma.user.update({ where: { id: adminId }, data: { locked: true }, select: { id: true } });
    await expect(service.issue(adminId, { email: email() })).rejects.toThrow("Administrator");
    await prisma.user.update({ where: { id: adminId }, data: { locked: false }, select: { id: true } });
  });

  it("stores only a token hash and creates a verified ordinary account with a separate beta grant", async () => {
    const invite = await service.issue(adminId, { email: email().toUpperCase(), accessDays: 30 });
    const row = await prisma.betaInvitation.findUniqueOrThrow({
      where: { id: invite.id },
      select: { tokenHash: true },
    });
    expect(row.tokenHash).toBe(createHash("sha256").update(invite.token).digest("hex"));
    expect(row.tokenHash).not.toBe(invite.token);
    await redeem(invite);
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: invite.email },
      select: {
        role: true,
        emailVerified: true,
        betaAccess: { select: { startsAt: true, expiresAt: true } },
        schedules: { select: { id: true } },
      },
    });
    expect(user.role).toBe("USER");
    expect(user.emailVerified).toBeInstanceOf(Date);
    expect(user.schedules).toHaveLength(1);
    expect(user.betaAccess!.expiresAt.getTime() - user.betaAccess!.startsAt.getTime()).toBe(30 * 86_400_000);
    await expect(redeem(invite)).rejects.toThrow("invalid or expired");
    await expect(service.issue(adminId, { email: invite.email })).rejects.toThrow("already has");
  });

  it("rejects a different email without consuming the invitation", async () => {
    const invite = await service.issue(adminId, { email: email() });
    await expect(redeem({ ...invite, email: email() })).rejects.toThrow("invalid or expired");
    expect(await service.inspect(invite.token)).not.toBeNull();
  });

  it("rejects expired, revoked, replaced, and malformed links", async () => {
    const invite = await service.issue(adminId, { email: email() });
    const replacement = await service.issue(adminId, { email: invite.email });
    expect(await service.inspect(invite.token)).toBeNull();
    await expect(redeem(invite)).rejects.toThrow("invalid or expired");
    await prisma.betaInvitation.update({ where: { id: replacement.id }, data: { expiresAt: new Date(0) } });
    await expect(redeem(replacement)).rejects.toThrow("invalid or expired");
    const fresh = await service.issue(adminId, { email: invite.email });
    await service.revoke(adminId, fresh.id);
    await expect(redeem(fresh)).rejects.toThrow("invalid or expired");
    await expect(redeem({ ...fresh, token: "bad" })).rejects.toThrow("invalid or expired");
  });

  it("rolls back redemption when account creation fails", async () => {
    const invite = await service.issue(adminId, { email: email() });
    await expect(
      service.redeem({
        ...invite,
        username: `${prefix}-failure`,
        hashedPassword: "test",
        workspaceType: "recruiting",
        scheduleName: null as unknown as string,
      })
    ).rejects.toThrow();
    expect(await service.inspect(invite.token)).not.toBeNull();
    expect(await prisma.user.findUnique({ where: { email: invite.email }, select: { id: true } })).toBeNull();
    await redeem(invite);
  });

  it("allows exactly one concurrent redemption", async () => {
    const invite = await service.issue(adminId, { email: email() });
    const results = await Promise.allSettled([redeem(invite), redeem(invite)]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.user.count({ where: { email: invite.email } })).toBe(1);
  });

  it("grants access only to owned workspaces and removes it on expiry or revocation", async () => {
    const invite = await service.issue(adminId, { email: email() });
    await redeem(invite);
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: invite.email },
      select: { id: true },
    });
    const team = await prisma.team.create({
      data: { name: prefix, members: { create: { userId: user.id, role: "MEMBER", accepted: true } } },
      select: { id: true },
    });
    teamIds.push(team.id);
    expect(await getTeamBetaAccess(team.id)).toBeNull();
    await prisma.membership.update({
      where: { userId_teamId: { userId: user.id, teamId: team.id } },
      data: { role: "OWNER" },
    });
    expect(await getTeamBetaAccess(team.id)).not.toBeNull();
    await prisma.betaAccessGrant.update({ where: { userId: user.id }, data: { expiresAt: new Date(0) } });
    expect(await getTeamBetaAccess(team.id)).toBeNull();
    await prisma.betaAccessGrant.update({
      where: { userId: user.id },
      data: { expiresAt: new Date(Date.now() + 86_400_000) },
    });
    await service.revoke(adminId, invite.id);
    expect(await getTeamBetaAccess(team.id)).toBeNull();
    expect(await prisma.user.findUnique({ where: { id: user.id }, select: { id: true } })).not.toBeNull();
  });
});
