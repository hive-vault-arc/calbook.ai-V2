"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { Button } from "@calcom/ui/components/button";
import { Logo } from "@calcom/ui/components/logo";
import { signOut } from "next-auth/react";
import type { ReactNode } from "react";

type OnboardingLayoutProps = {
  userEmail: string;
  currentStep: 1 | 2 | 3 | 4;
  children: ReactNode;
};

export const OnboardingLayout = ({ userEmail, currentStep, children }: OnboardingLayoutProps) => {
  const { t } = useLocale();

  const handleSignOut = () => {
    signOut({ callbackUrl: "/auth/logout" });
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-start overflow-x-hidden bg-[#faf9ff]">
      {/* Header */}
      <div className="relative flex w-full items-center justify-between border-violet-100 border-b bg-white/85 px-4 py-4 backdrop-blur sm:px-6">
        <Logo className="h-5 w-auto" />

        {/* Progress dots - centered */}
        <div className="absolute left-1/2 flex -translate-x-1/2 items-center justify-center gap-1">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={classNames("rounded-full transition-all", {
                "h-1.5 w-1.5 bg-violet-600": step === currentStep,
                "h-1 w-1 bg-violet-400": step < currentStep,
                "h-1 w-1 bg-violet-200": step > currentStep,
              })}
            />
          ))}
        </div>

        <div className="hidden items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-3 py-2 sm:flex">
          <p className="max-w-52 truncate text-sm font-medium leading-none text-violet-900">{userEmail}</p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex w-full flex-1 items-start justify-center px-6 py-8">
        <div className="flex w-full max-w-[640px] flex-col gap-4">{children}</div>
      </div>

      {/* Footer with signout button */}
      <div className="flex w-full items-center justify-center px-6 py-6">
        <Button onClick={handleSignOut} color="minimal">
          {t("sign_out")}
        </Button>
      </div>
    </div>
  );
};
