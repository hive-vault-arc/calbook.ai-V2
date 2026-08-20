import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { checkOnboardingRedirect } from "@calcom/features/auth/lib/onboardingUtils";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactElement } from "react";
import { LandingPage } from "~/marketing/LandingPage";

const Page = async (): Promise<ReactElement> => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (session?.user?.id) {
    const organizationId = session.user.profile?.organizationId ?? null;
    const onboardingPath = await checkOnboardingRedirect(session.user.id, {
      checkEmailVerification: true,
      organizationId,
    });
    if (onboardingPath) {
      redirect(onboardingPath);
    }
    redirect("/home");
  }

  return <LandingPage />;
};

export default Page;
