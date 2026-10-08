import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { getTranslation } from "@calcom/i18n/server";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { ErrorWithCode } from "@calcom/lib/errors";
import { serverConfig } from "@calcom/lib/serverConfig";
import prisma from "@calcom/prisma";
import { createTransport } from "nodemailer";

export async function sendBetaInvitationEmail(
  invite: {
    email: string;
    token: string;
    expiresAt: Date;
  },
  accessDays: number
): Promise<void> {
  if (
    !serverConfig.from ||
    (await new FeaturesRepository(prisma).checkIfFeatureIsEnabledGlobally("emails"))
  ) {
    throw ErrorWithCode.Factory.BadRequest("Invitation email delivery is disabled");
  }
  const url = new URL("/signup", WEBAPP_URL);
  const isLocalHttp = url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
  if (url.protocol !== "https:" && !isLocalHttp) {
    throw ErrorWithCode.Factory.BadRequest("Invitation links require a secure application URL");
  }
  url.searchParams.set("betaToken", invite.token);
  const t = await getTranslation("en", "common");
  await createTransport(serverConfig.transport).sendMail({
    from: serverConfig.from,
    to: invite.email,
    subject: t("beta_invite_email_subject"),
    text: t("beta_invite_email_body", {
      url: url.toString(),
      days: accessDays,
      date: invite.expiresAt.toISOString().slice(0, 10),
      interpolation: { escapeValue: false },
    }),
  });
}
