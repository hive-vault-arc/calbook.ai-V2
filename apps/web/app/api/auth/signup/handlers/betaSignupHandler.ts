import { BetaInvitationService } from "@calcom/features/auth/beta/BetaInvitationService";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { getTranslation } from "@calcom/i18n/server";
import { hashPassword } from "@calcom/lib/auth/hashPassword";
import { ErrorWithCode } from "@calcom/lib/errors";
import { getServerErrorFromUnknown } from "@calcom/lib/server/getServerErrorFromUnknown";
import { isUsernameReservedDueToMigration } from "@calcom/lib/server/username";
import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";
import { signupSchema } from "@calcom/prisma/zod-utils";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = signupSchema.extend({
  betaToken: z.string().regex(/^[a-f0-9]{64}$/),
  workspaceType: z.enum(["recruiting", "scheduling"]),
});

export async function betaSignupHandler(body: Record<string, string>): Promise<NextResponse> {
  try {
    const data = schema.parse(body);
    const username = slugify(data.username ?? "");
    if (data.token || !username || (await isUsernameReservedDueToMigration(username))) {
      throw ErrorWithCode.Factory.BadRequest("Invalid signup details");
    }
    if (await new FeaturesRepository(prisma).checkIfFeatureIsEnabledGlobally("disable-signup")) {
      throw ErrorWithCode.Factory.Forbidden("Signup is temporarily disabled");
    }
    const service = new BetaInvitationService();
    const invitation = await service.inspect(data.betaToken);
    if (!invitation || invitation.email !== data.email.toLowerCase()) {
      throw ErrorWithCode.Factory.Forbidden("This beta invitation is invalid or expired");
    }
    const t = await getTranslation(data.language ?? "en", "common");
    await service.redeem({
      token: data.betaToken,
      email: data.email,
      username,
      hashedPassword: await hashPassword(data.password),
      workspaceType: data.workspaceType,
      scheduleName: t("default_schedule_name"),
    });
    return NextResponse.json({ message: "Created user" }, { status: 201 });
  } catch (error) {
    const failure = getServerErrorFromUnknown(error);
    return NextResponse.json(
      {
        message: failure.statusCode < 500 ? failure.message : "Unable to complete signup. Please try again.",
      },
      { status: failure.statusCode }
    );
  }
}
