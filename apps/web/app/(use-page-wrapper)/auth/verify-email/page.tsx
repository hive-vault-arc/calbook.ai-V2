import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma from "@calcom/prisma";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import VerifyEmailPage from "~/auth/verify-email-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("verify_email_button"),
    () => "",
    undefined,
    undefined,
    "/auth/verify-email"
  );
};

const ServerPageWrapper = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (session?.user.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { emailVerified: true },
    });

    if (user?.emailVerified) {
      redirect("/");
    }
  }

  return <VerifyEmailPage />;
};

export default ServerPageWrapper;
