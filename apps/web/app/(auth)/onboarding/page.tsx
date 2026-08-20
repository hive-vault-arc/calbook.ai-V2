import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { OnboardingWizard } from "~/onboarding-wizard/OnboardingWizard";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("onboarding"),
    (t) => t("onboarding_subtitle"),
    undefined,
    undefined,
    "/onboarding"
  );

export default async function Page() {
  const requestHeaders = await headers();
  const requestCookies = await cookies();
  const session = await getServerSession({ req: buildLegacyRequest(requestHeaders, requestCookies) });
  if (!session?.user?.id) return redirect("/auth/login");
  return (
    <div className="bg-default min-h-screen py-12">
      <OnboardingWizard />
    </div>
  );
}
