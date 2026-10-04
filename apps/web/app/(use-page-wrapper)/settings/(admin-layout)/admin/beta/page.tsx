import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import prisma from "@calcom/prisma";
import { getTranslate } from "app/_utils";
import { inviteBetaApplicant, requireBetaAdmin, revokeBetaInvitation } from "./actions";
import { BetaActionForm } from "./BetaActionForm";

export default async function BetaInvitationsPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string }>;
}) {
  await requireBetaAdmin();
  const t = await getTranslate();
  const { result } = await searchParams;
  const notices: Record<string, string> = {
    sent: "beta_invite_sent",
    "delivery-failed": "beta_invite_delivery_failed",
    invalid: "beta_invite_invalid",
    revoked: "beta_invite_revoked",
  };
  const invitations = await prisma.betaInvitation.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      email: true,
      cohort: true,
      expiresAt: true,
      sentAt: true,
      redeemedAt: true,
      revokedAt: true,
      grant: { select: { expiresAt: true, user: { select: { username: true } } } },
    },
  });
  return (
    <SettingsHeader title={t("beta_invitations")} description={t("beta_invitations_description")}>
      <div className="space-y-6 p-4 sm:p-6">
        {result && notices[result] ? (
          <p role="status" className="rounded-lg border border-subtle p-4 text-sm">
            {t(notices[result])}
          </p>
        ) : null}
        <BetaActionForm
          action={inviteBetaApplicant}
          label={t("beta_approve_send")}
          className="grid gap-4 rounded-xl border border-subtle p-5 sm:grid-cols-2">
          <label className="text-sm">
            {t("email")}
            <input
              name="email"
              type="email"
              required
              className="mt-2 block w-full rounded-md border border-subtle bg-default p-2"
            />
          </label>
          <label className="text-sm">
            {t("beta_cohort")}
            <input
              name="cohort"
              required
              maxLength={60}
              defaultValue="private-beta"
              className="mt-2 block w-full rounded-md border border-subtle bg-default p-2"
            />
          </label>
          <label className="text-sm">
            {t("beta_access_days")}
            <input
              name="accessDays"
              type="number"
              min={1}
              max={365}
              defaultValue={90}
              required
              className="mt-2 block w-full rounded-md border border-subtle bg-default p-2"
            />
          </label>
          <p className="text-sm text-subtle sm:col-span-2">{t("beta_invite_terms")}</p>
        </BetaActionForm>
        <p className="text-sm text-subtle">{t("beta_latest_invitations")}</p>
        <ul className="divide-y divide-subtle rounded-xl border border-subtle">
          {invitations.map((invite) => {
            let status = "beta_invite_pending";
            if (invite.sentAt) status = "beta_invite_waiting";
            if (invite.expiresAt <= new Date()) status = "beta_invite_expired";
            if (invite.redeemedAt) status = "beta_invite_joined";
            if (invite.revokedAt) status = "beta_invite_revoked";
            return (
              <li key={invite.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="break-all font-medium">{invite.email}</p>
                  <p className="text-sm text-subtle">
                    {invite.cohort} · {t(status)}
                  </p>
                  {invite.grant ? (
                    <p className="text-sm text-subtle">
                      {t("beta_access_until", { date: invite.grant.expiresAt.toISOString().slice(0, 10) })}
                    </p>
                  ) : null}
                </div>
                {!invite.revokedAt ? (
                  <BetaActionForm action={revokeBetaInvitation} label={t("beta_revoke_access")}>
                    <input type="hidden" name="id" value={invite.id} />
                  </BetaActionForm>
                ) : null}
              </li>
            );
          })}
          {!invitations.length ? (
            <li className="p-4 text-sm text-subtle">{t("beta_no_invitations")}</li>
          ) : null}
        </ul>
      </div>
    </SettingsHeader>
  );
}
