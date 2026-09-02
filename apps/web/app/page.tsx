import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { checkOnboardingRedirect } from "@calcom/features/auth/lib/onboardingUtils";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { _generateMetadataForStaticPage } from "app/_utils";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactElement } from "react";
import { LandingPage } from "~/marketing/LandingPage";

export const generateMetadata = async (): Promise<Metadata> => {
  const title = "Interview Scheduling Software for Recruitment Teams";
  const description =
    "CalBook.ai gives recruitment teams one polished workflow for interview templates, candidate self-scheduling, calendar coordination, and follow-up.";
  const metadata = await _generateMetadataForStaticPage(title, description, false, undefined, "/");

  return {
    ...metadata,
    keywords: [
      "interview scheduling software",
      "recruitment scheduling",
      "candidate self scheduling",
      "recruiting calendar",
    ],
    twitter: {
      card: "summary_large_image",
      title: "Interview scheduling without the back-and-forth | CalBook.ai",
      description: "A focused interview scheduling workflow for recruitment teams and their candidates.",
    },
  };
};

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
