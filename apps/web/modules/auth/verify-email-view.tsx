"use client";

import { useFlagMap } from "@calcom/features/flags/context/provider";
import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import useEmailVerifyCheck from "@calcom/trpc/react/hooks/useEmailVerifyCheck";
import { Button } from "@calcom/ui/components/button";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { showToast } from "@calcom/ui/components/toast";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import posthog from "posthog-js";
import { useEffect } from "react";

const EMAIL_CLIENTS = [
  {
    name: "Gmail",
    icon: "/email-clients/gmail.svg",
    href: "https://mail.google.com/mail/u/0/#search/%22api%2Fauth%2Fverify-email%22",
  },
  {
    name: "Outlook",
    icon: "/email-clients/outlook.svg",
    href: "https://outlook.live.com/mail/0/",
  },
  {
    name: "Yahoo",
    icon: "/email-clients/yahoo.svg",
    href: `https://mail.yahoo.com/d/search?p=${encodeURIComponent(APP_NAME)}`,
  },
  {
    name: "Proton",
    icon: "/email-clients/proton.svg",
    href: "https://mail.proton.me",
  },
] as const;

function VerifyEmailPage() {
  const { data } = useEmailVerifyCheck();
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, isLocaleReady } = useLocale();
  const mutation = trpc.viewer.auth.resendVerifyEmail.useMutation();
  const flags = useFlagMap();
  const wasJustVerified = searchParams?.get("verified") === "1";

  useEffect(() => {
    if (!wasJustVerified && data?.isVerified) {
      posthog.capture("verify_email_already_verified", {
        onboarding_v3_enabled: flags["onboarding-v3"],
      });
      const gettingStartedPath = flags["onboarding-v3"] ? "/onboarding/getting-started" : "/getting-started";
      router.replace(gettingStartedPath);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.isVerified, flags, wasJustVerified]);
  if (!isLocaleReady) {
    return null;
  }
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#faf9ff] px-4 py-10 dark:bg-[#110d20]">
      <div className="pointer-events-none absolute -top-36 right-[15%] h-80 w-80 rounded-full bg-violet-200/60 blur-3xl dark:bg-violet-700/20" />
      <div className="pointer-events-none absolute -bottom-36 left-[15%] h-80 w-80 rounded-full bg-fuchsia-100/80 blur-3xl dark:bg-fuchsia-700/10" />

      <div className="relative z-10 flex w-full max-w-xl flex-col items-center">
        <Link href="/" className="mb-8" aria-label="CalBook.ai home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/calbook-logo.svg" alt="CalBook.ai" className="h-9 w-auto" />
        </Link>
        <div data-testid="verify-email-page" className="w-full">
          <EmptyScreen
            border
            dashedBorder={false}
            Icon={wasJustVerified ? "circle-check" : "mail-open"}
            headline={wasJustVerified ? t("email_confirmed") : t("check_your_email")}
            description={
              wasJustVerified
                ? t("email_confirmed_sign_in")
                : t("verify_email_page_body", { email: session?.user?.email, appName: APP_NAME })
            }
            className="rounded-2xl border-violet-100 bg-default p-8 shadow-[0_24px_70px_-30px_rgba(91,33,182,0.35)] dark:border-violet-900/70 dark:bg-[#181126] sm:p-12"
            iconWrapperClassName="bg-violet-600 shadow-[0_12px_28px_-12px_rgba(109,40,217,0.7)]"
            buttonRaw={
              wasJustVerified ? (
                <Button
                  className="bg-violet-600 text-white hover:bg-violet-700"
                  onClick={() => {
                    signOut({ callbackUrl: "/auth/login" });
                  }}>
                  {t("sign_in_to_continue")}
                </Button>
              ) : (
                <>
                  <div className="mb-5 flex flex-wrap items-center justify-center gap-2">
                    {EMAIL_CLIENTS.map(({ name, icon, href }) => (
                      <Button
                        key={name}
                        color="secondary"
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border-violet-200 bg-default hover:bg-violet-50 dark:border-violet-800 dark:hover:bg-violet-950/40">
                        <img src={icon} alt={name} className="me-1 h-4 w-4" /> {name}
                      </Button>
                    ))}
                  </div>
                  <div className="flex flex-col items-center gap-3">
                    <Button
                      color="minimal"
                      className="text-violet-700 hover:bg-violet-50 hover:text-violet-800 dark:text-violet-300 dark:hover:bg-violet-950/40 dark:hover:text-violet-200"
                      loading={mutation.isPending}
                      onClick={() => {
                        posthog.capture("verify_email_resend_clicked");
                        showToast(t("send_email"), "success");
                        mutation.mutate();
                      }}>
                      {t("resend_email")}
                    </Button>
                    <Button
                      color="minimal"
                      className="text-subtle hover:bg-violet-50 hover:text-emphasis dark:hover:bg-violet-950/40"
                      onClick={() => {
                        signOut({ callbackUrl: "/signup" });
                      }}>
                      {t("use_different_email")}
                    </Button>
                  </div>
                </>
              )
            }
          />
        </div>
      </div>
    </div>
  );
}

export default VerifyEmailPage;
