import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { APP_NAME, WEBAPP_URL } from "@calcom/lib/constants";
import { ErrorWithCode } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";
import { piiHasher } from "@calcom/lib/server/PiiHasher";
import { serverConfig } from "@calcom/lib/serverConfig";
import Handlebars from "handlebars";
import type { SendVerificationRequestParams } from "next-auth/providers/email";
import nodemailer from "nodemailer";

const transporter: ReturnType<typeof nodemailer.createTransport> = nodemailer.createTransport(
  serverConfig.transport
);

const sendVerificationRequest = async ({
  identifier,
  url,
}: Pick<SendVerificationRequestParams, "identifier" | "url">): Promise<void> => {
  let stage: "rate_limit" | "template" | "transport" = "rate_limit";
  try {
    await checkRateLimitAndThrowError({
      failClosed: true,
      rateLimitingType: "forcedSlowMode",
      identifier: `emailSignIn:${piiHasher.hash(identifier.trim().toLowerCase())}`,
    });

    stage = "template";
    const emailsDir = path.resolve(process.cwd(), "..", "..", "packages/emails", "templates");
    const originalUrl = new URL(url);
    const webappUrl = new URL(process.env.NEXTAUTH_URL || WEBAPP_URL);
    if (originalUrl.origin !== webappUrl.origin) {
      url = url.replace(originalUrl.origin, webappUrl.origin);
    }
    const emailFile = readFileSync(path.join(emailsDir, "confirm-email.html"), {
      encoding: "utf8",
    });
    const emailTemplate = Handlebars.compile(emailFile);
    const html = emailTemplate({ base_url: WEBAPP_URL, signin_url: url, email: identifier });
    stage = "transport";
    await transporter.sendMail({
      from: `${process.env.EMAIL_FROM}` || APP_NAME,
      to: identifier,
      subject: `Your sign-in link for ${APP_NAME}`,
      html,
    });
  } catch {
    // Transport errors can contain recipients, credentials, or token-bearing links.
    logger.error("Sign-in email failed", { stage });
    throw ErrorWithCode.Factory.InternalServerError(`Unable to send sign-in email (${stage}).`);
  }
};

export default sendVerificationRequest;
