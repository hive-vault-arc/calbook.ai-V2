"use client";

import process from "node:process";
import getStripe from "@calcom/app-store/stripepayment/lib/client";
import { getPremiumPlanPriceValue } from "@calcom/app-store/stripepayment/lib/utils";
import {
  fetchSignup,
  hasCheckoutSession,
  isAccountUnderReview,
  isUserAlreadyExistsError,
} from "@calcom/features/auth/signup/lib/fetchSignup";
import { getOrgUsernameFromEmail } from "@calcom/features/auth/signup/utils/getOrgUsernameFromEmail";
import ServerTrans from "@calcom/lib/components/ServerTrans";
import {
  APP_NAME,
  CLOUDFLARE_SITE_ID,
  IS_CALCOM,
  URL_PROTOCOL_REGEX,
  WEBAPP_URL,
  WEBSITE_PRIVACY_POLICY_URL,
  WEBSITE_TERMS_URL,
  WEBSITE_URL,
} from "@calcom/lib/constants";
import { isENVDev } from "@calcom/lib/env";
import { fetchUsername } from "@calcom/lib/fetchUsername";
import { pushGTMEvent } from "@calcom/lib/gtm";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { INVALID_CLOUDFLARE_TOKEN_ERROR } from "@calcom/lib/server/checkCfTurnstileToken";
import { IS_EUROPE } from "@calcom/lib/timezoneConstants";
import { signupSchema as apiSignupSchema } from "@calcom/prisma/zod-utils";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import classNames from "@calcom/ui/classNames";
import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";
import { CheckboxField, Form, PasswordField, TextField } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";
import {
  type WorkspaceType,
  WorkspaceTypeSelector,
} from "@calcom/web/modules/onboarding/components/WorkspaceTypeSelector";
import { InfoIcon, ShieldCheckIcon, StarIcon } from "@coss/ui/icons";
import { Analytics as DubAnalytics } from "@dub/analytics/react";
import { zodResolver } from "@hookform/resolvers/zod";
import type { getServerSideProps } from "@lib/signup/getServerSideProps";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { signIn } from "next-auth/react";
import posthog from "posthog-js";
import { useEffect, useState } from "react";
import type { SubmitHandler } from "react-hook-form";
import { useForm, useFormContext } from "react-hook-form";
import { Toaster } from "sonner";
import { z } from "zod";

const signupSchema = apiSignupSchema.extend({
  apiError: z.string().optional(), // Needed to display API errors doesn't get passed to the API
  cfToken: z.string().optional(),
});

const TurnstileCaptcha = dynamic(() => import("@calcom/web/modules/auth/components/Turnstile"), {
  ssr: false,
});

type FormValues = z.infer<typeof signupSchema>;

export type SignupProps = inferSSRProps<typeof getServerSideProps>;

const FEATURES = [
  {
    title: "connect_all_calendars",
    description: "connect_all_calendars_description",
    i18nOptions: {
      appName: APP_NAME,
    },
    icon: "calendar-heart" as const,
  },
  {
    title: "set_availability",
    description: "set_availbility_description",
    icon: "users" as const,
  },
  {
    title: "share_a_link_or_embed",
    description: "share_a_link_or_embed_description",
    icon: "link-2" as const,
    i18nOptions: {
      appName: APP_NAME,
    },
  },
];

function truncateDomain(domain: string) {
  const maxLength = 25;
  const cleanDomain = domain.replace(URL_PROTOCOL_REGEX, "");

  if (cleanDomain.length <= maxLength) {
    return cleanDomain;
  }

  return `${cleanDomain.substring(0, maxLength - 3)}.../`;
}

function UsernameField({
  username,
  setPremium,
  premium,
  setUsernameTaken,
  orgSlug,
  usernameTaken,
  disabled,
  ...props
}: React.ComponentProps<typeof TextField> & {
  username: string;
  setPremium: (value: boolean) => void;
  premium: boolean;
  usernameTaken: boolean;
  orgSlug?: string;
  setUsernameTaken: (value: boolean) => void;
}) {
  const { t } = useLocale();
  const { register, formState } = useFormContext<FormValues>();
  const debouncedUsername = useDebounce(username, 600);

  useEffect(() => {
    if (formState.isSubmitting || formState.isSubmitSuccessful) return;

    async function checkUsername() {
      // If the username can't be changed, there is no point in doing the username availability check
      if (disabled) return;
      if (!debouncedUsername) {
        setPremium(false);
        setUsernameTaken(false);
        return;
      }
      fetchUsername(debouncedUsername, orgSlug ?? null).then(({ data }) => {
        setPremium(data.premium);
        setUsernameTaken(!data.available);
      });
    }
    checkUsername();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debouncedUsername,
    disabled,
    orgSlug,
    formState.isSubmitting,
    formState.isSubmitSuccessful,
    setPremium,
    setUsernameTaken,
  ]);

  return (
    <div>
      <TextField
        disabled={disabled}
        {...props}
        {...register("username")}
        data-testid="signup-usernamefield"
      />
      {(!formState.isSubmitting || !formState.isSubmitted) && (
        <div className="flex items-center text-default text-gray text-sm">
          <div className="text-sm">
            {usernameTaken ? (
              <div className="flex items-center text-error">
                <InfoIcon className="mr-1 inline-block h-4 w-4" />
                <p>{t("already_in_use_error")}</p>
              </div>
            ) : premium ? (
              <div data-testid="premium-username-warning" className="flex items-center">
                <StarIcon className="mr-1 inline-block h-4 w-4" />
                <p>
                  {t("premium_username", {
                    price: getPremiumPlanPriceValue(),
                    interpolation: { escapeValue: false },
                  })}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function addOrUpdateQueryParam(url: string, key: string, value: string) {
  const separator = url.includes("?") ? "&" : "?";
  const param = `${key}=${encodeURIComponent(value)}`;
  return `${url}${separator}${param}`;
}

export default function Signup({
  prepopulateFormValues,
  token,
  betaToken,
  orgSlug,
  isGoogleLoginEnabled,
  isOutlookLoginEnabled,
  orgAutoAcceptEmail,
  redirectUrl,
  emailVerificationEnabled,
  onboardingV3Enabled,
}: SignupProps) {
  const isOrgInviteByLink = orgSlug && !prepopulateFormValues?.username;
  const [premiumUsername, setPremiumUsername] = useState(false);
  const [usernameTaken, setUsernameTaken] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isMicrosoftLoading, setIsMicrosoftLoading] = useState(false);
  const [accountUnderReview, setAccountUnderReview] = useState(false);
  const [displayEmailForm, setDisplayEmailForm] = useState(token || betaToken);
  const [turnstileKey, setTurnstileKey] = useState(0);
  const searchParams = useCompatSearchParams();
  const { t, i18n } = useLocale();
  const router = useRouter();
  const formMethods = useForm<FormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: prepopulateFormValues satisfies FormValues,
    mode: "onTouched",
  });
  const {
    register,
    watch,
    formState: { isSubmitting, errors, isSubmitSuccessful },
  } = formMethods;

  useEffect(() => {
    if (redirectUrl) {
      localStorage.setItem("onBoardingRedirect", redirectUrl);
    }
  }, [redirectUrl]);

  const [userConsentToCookie, setUserConsentToCookie] = useState(false); // No need to be checked for user to proceed

  function handleConsentChange(consent: boolean) {
    setUserConsentToCookie(!consent);
  }

  const loadingSubmitState = isSubmitSuccessful || isSubmitting;
  const displayBackButton = token || betaToken ? false : displayEmailForm;

  const signUp: SubmitHandler<FormValues> = async (_data) => {
    const { cfToken, ...data } = _data;

    if (!betaToken)
      posthog.capture("signup_form_submitted", {
        has_token: !!token,
        is_org_invite: isOrgInviteByLink,
        org_slug: orgSlug,
        is_premium_username: premiumUsername,
        username_taken: usernameTaken,
        workspace_type: data.workspaceType,
      });

    try {
      const result = await fetchSignup(
        {
          ...data,
          language: i18n.language,
          token,
          betaToken,
        },
        cfToken
      );

      if (!result.ok) {
        if (isUserAlreadyExistsError(result)) {
          showToast(t("account_already_exists_please_login"), "warning");
          const callbackUrl = token ? `/teams?token=${token}` : "/event-types";
          setTimeout(() => {
            router.push(`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
          }, 3000);
          return;
        }

        if (hasCheckoutSession(result)) {
          const stripe = await getStripe();
          if (stripe) {
            const { error } = await stripe.redirectToCheckout({
              sessionId: result.error.checkoutSessionId,
            });
            if (error) console.warn(error.message);
          }
          return;
        }

        throw new Error(result.error.message);
      }

      if (isAccountUnderReview(result)) {
        setAccountUnderReview(true);
        return;
      }

      if (!betaToken && process.env.NEXT_PUBLIC_GTM_ID) {
        pushGTMEvent("create_account", { email: data.email, user: data.username, lang: data.language });
      }

      const gettingStartedPath = onboardingV3Enabled ? "onboarding/getting-started" : "getting-started";
      const verifyOrGettingStarted =
        emailVerificationEnabled && !betaToken ? "auth/verify-email" : gettingStartedPath;
      const constructCallBackIfUrlPresent = () => {
        if (isOrgInviteByLink) {
          return `${WEBAPP_URL}/${searchParams.get("callbackUrl")}`;
        }
        return addOrUpdateQueryParam(`${WEBAPP_URL}/${searchParams.get("callbackUrl")}`, "from", "signup");
      };

      const constructCallBackIfUrlNotPresent = () => {
        return `${WEBAPP_URL}/${verifyOrGettingStarted}?from=signup`;
      };

      const constructCallBackUrl = () => {
        const callbackUrlSearchParams = searchParams?.get("callbackUrl");
        return callbackUrlSearchParams ? constructCallBackIfUrlPresent() : constructCallBackIfUrlNotPresent();
      };

      await signIn<"credentials">("credentials", {
        ...data,
        callbackUrl: constructCallBackUrl(),
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t("unexpected_error_try_again");

      if (errorMessage === INVALID_CLOUDFLARE_TOKEN_ERROR) {
        formMethods.setError("apiError", { message: t("unexpected_error_try_again") });
        return;
      }

      if (!betaToken)
        posthog.capture("signup_form_submit_error", {
          has_token: !!token,
          is_org_invite: isOrgInviteByLink,
          org_slug: orgSlug,
          is_premium_username: premiumUsername,
          error_message: errorMessage,
        });
      formMethods.setError("apiError", { message: errorMessage });
    } finally {
      setTurnstileKey((k) => k + 1);
      formMethods.setValue("cfToken", undefined);
    }
  };

  return (
    <>
      {!betaToken && IS_CALCOM && (!IS_EUROPE || userConsentToCookie) ? (
        <>
          {process.env.NEXT_PUBLIC_GTM_ID && (
            <>
              {/* biome-ignore lint/security/noDangerouslySetInnerHtml: GTM script injection */}
              <Script
                id="gtm-init-script"
                // It is strictly not necessary to disable, but in a future update of react/no-danger this will error.
                // And we don't want it to error here anyways

                dangerouslySetInnerHTML={{
                  __html: `(function (w, d, s, l, i) {
                        w[l] = w[l] || []; w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
                        var f = d.getElementsByTagName(s)[0], j = d.createElement(s), dl = l != 'dataLayer' ? '&l=' + l : '';
                        j.async = true; j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl; f.parentNode.insertBefore(j, f);
                    })(window, document, 'script', 'dataLayer', '${process.env.NEXT_PUBLIC_GTM_ID}');`,
                }}
              />
              {/* biome-ignore lint/security/noDangerouslySetInnerHtml: GTM noscript fallback */}
              <noscript
                dangerouslySetInnerHTML={{
                  __html: `<iframe src="https://www.googletagmanager.com/ns.html?id=${process.env.NEXT_PUBLIC_GTM_ID}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`,
                }}
              />
            </>
          )}
          <DubAnalytics
            apiHost="/_proxy/dub"
            cookieOptions={{
              domain: isENVDev ? undefined : `.${new URL(WEBSITE_URL).hostname}`,
            }}
            domainsConfig={{
              refer: "refer.cal.com",
            }}
          />
        </>
      ) : null}
      <div
        className={classNames(
          "light flex min-h-screen w-full flex-col items-center justify-center bg-[#faf9ff] px-4 py-10 [--cal-brand:#6d28d9] dark:bg-[#110d20] dark:[--cal-brand:#c4b5fd]",
          "[--cal-brand-subtle:#9CA3AF]",
          "[--cal-brand-text:#FFFFFF] dark:[--cal-brand-text:#000000]",
          "[--cal-brand-emphasis:#101010] dark:[--cal-brand-emphasis:#e1e1e1]"
        )}>
        <div className="grid w-full max-w-[1180px] grid-cols-1 overflow-hidden rounded-2xl border border-violet-100 bg-default shadow-[0_24px_70px_-30px_rgba(91,33,182,0.35)] lg:grid-cols-2 dark:border-violet-900/70 dark:bg-[#181126]">
          {/* Left side */}
          <div className="mt-0 mr-auto ml-auto flex w-full max-w-xl flex-col px-6 py-10 sm:px-12 lg:px-16 lg:py-14">
            <Link href="/" className="mb-10 w-fit" aria-label="CalBook.ai home">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/calbook-logo.svg" alt="CalBook.ai" className="h-9 w-auto" />
            </Link>
            {accountUnderReview ? (
              <div
                className="flex flex-col items-center gap-4 py-10 text-center"
                data-testid="account-under-review">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-subtle">
                  <ShieldCheckIcon className="h-6 w-6 text-default" />
                </div>
                <h1 className="font-cal text-[28px] leading-none">{t("account_under_review_title")}</h1>
                <p className="font-medium text-base text-subtle leading-5">
                  {t("account_under_review_description")}
                </p>
                <Button href="/auth/login" className="mt-4">
                  {t("go_back_login")}
                </Button>
              </div>
            ) : (
              <>
                {displayBackButton && (
                  <div className="flex w-fit lg:-mt-12">
                    <Button
                      color="minimal"
                      className="todesktop:mt-10 mb-6 flex h-6 max-h-6 w-full items-center rounded-md px-3 py-2 hover:bg-subtle"
                      StartIcon="arrow-left"
                      data-testid="signup-back-button"
                      onClick={() => {
                        setDisplayEmailForm(false);
                      }}>
                      {t("back")}
                    </Button>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <h1 className="font-cal text-[28px] leading-none">{t("create_your_calcom_account")}</h1>
                  <p className="font-medium text-base text-subtle leading-5">
                    {t("signup_calbook_description")}
                  </p>
                </div>

                {/* Form Container */}
                {displayEmailForm && (
                  <div className="mt-6">
                    {betaToken ? (
                      <p className="mb-4 rounded-lg bg-brand-subtle p-4 text-sm text-emphasis">
                        {t("beta_signup_notice")}
                      </p>
                    ) : null}
                    <Form
                      className="flex flex-col gap-4"
                      form={formMethods}
                      handleSubmit={async (values) => {
                        let updatedValues = values;
                        if (!formMethods.getValues().username && isOrgInviteByLink) {
                          updatedValues = {
                            ...values,
                            username: getOrgUsernameFromEmail(values.email, orgAutoAcceptEmail),
                          };
                        }
                        await signUp(updatedValues);
                      }}>
                      {!isOrgInviteByLink ? (
                        <div className="flex flex-col gap-3" data-testid="signup-workspace-type">
                          <div>
                            <p className="font-medium text-emphasis text-sm">
                              {t("onboarding_workspace_title")}
                            </p>
                            <p className="mt-1 text-sm text-subtle">
                              {t("onboarding_workspace_description")}
                            </p>
                          </div>
                          <WorkspaceTypeSelector
                            value={watch("workspaceType")}
                            onValueChange={(value: WorkspaceType) => {
                              formMethods.setValue("workspaceType", value, {
                                shouldDirty: true,
                                shouldValidate: true,
                              });
                            }}
                            testIdPrefix="signup-workspace"
                          />
                        </div>
                      ) : null}
                      {/* Username */}
                      {!isOrgInviteByLink ? (
                        <UsernameField
                          orgSlug={orgSlug}
                          label={t("username")}
                          username={watch("username") || ""}
                          premium={premiumUsername}
                          usernameTaken={usernameTaken}
                          disabled={!!orgSlug}
                          setUsernameTaken={(value) => setUsernameTaken(value)}
                          data-testid="signup-usernamefield"
                          setPremium={(value) => setPremiumUsername(value)}
                          addOnLeading={
                            orgSlug
                              ? truncateDomain(`${WEBAPP_URL.replace(URL_PROTOCOL_REGEX, "")}/`)
                              : truncateDomain(`${WEBSITE_URL.replace(URL_PROTOCOL_REGEX, "")}/`)
                          }
                        />
                      ) : null}
                      {/* Email */}
                      <TextField
                        id="signup-email"
                        {...register("email")}
                        label={t("email")}
                        placeholder="john@doe.com"
                        type="email"
                        autoComplete="email"
                        readOnly={Boolean(prepopulateFormValues?.email)}
                        data-testid="signup-emailfield"
                      />

                      {/* Password */}
                      <PasswordField
                        id="signup-password"
                        data-testid="signup-passwordfield"
                        autoComplete="new-password"
                        label={t("password")}
                        {...register("password")}
                        hintErrors={["caplow", "min", "num"]}
                      />
                      {/* Cloudflare Turnstile Captcha */}
                      {CLOUDFLARE_SITE_ID ? (
                        <TurnstileCaptcha
                          key={turnstileKey}
                          action="signup"
                          appearance="interaction-only"
                          onVerify={(token) => {
                            formMethods.setValue("cfToken", token);
                          }}
                          onExpire={() => {
                            formMethods.setValue("cfToken", undefined);
                          }}
                          onError={() => {
                            formMethods.setValue("cfToken", undefined);
                          }}
                        />
                      ) : null}

                      <CheckboxField
                        data-testid="signup-cookie-content-checkbox"
                        onChange={() => handleConsentChange(userConsentToCookie)}
                        description={t("cookie_consent_checkbox")}
                      />
                      {errors.apiError && (
                        <Alert
                          className="mb-3"
                          severity="error"
                          message={errors.apiError?.message}
                          data-testid="signup-error-message"
                        />
                      )}
                      <Button
                        type="submit"
                        data-testid="signup-submit-button"
                        className="my-2 w-full justify-center bg-violet-600 text-white hover:bg-violet-700"
                        loading={loadingSubmitState}
                        disabled={
                          !!formMethods.formState.errors.username ||
                          !!formMethods.formState.errors.email ||
                          !formMethods.getValues("email") ||
                          !formMethods.getValues("password") ||
                          (!isOrgInviteByLink && !watch("workspaceType")) ||
                          (CLOUDFLARE_SITE_ID && !process.env.NEXT_PUBLIC_IS_E2E && !watch("cfToken")) ||
                          isSubmitting ||
                          usernameTaken
                        }>
                        {premiumUsername && !usernameTaken
                          ? `${t("get_started")} (${getPremiumPlanPriceValue()})`
                          : t("get_started")}
                      </Button>
                    </Form>
                  </div>
                )}
                {!displayEmailForm && (
                  <div className="mt-8 flex flex-col gap-6">
                    {/* Upper Row */}
                    {isGoogleLoginEnabled && (
                      <div className="flex flex-col gap-2 md:flex-row">
                        <Button
                          color="secondary"
                          loading={isGoogleLoading}
                          disabled={isMicrosoftLoading}
                          CustomStartIcon={
                            <>
                              {/* eslint-disable @next/next/no-img-element */}
                              <img
                                className={classNames(
                                  "mr-2 h-4 w-4 text-subtle",
                                  premiumUsername && "opacity-50"
                                )}
                                src="/google-icon-colored.svg"
                                alt="Continue with Google Icon"
                              />
                            </>
                          }
                          className={classNames(
                            "w-full justify-center rounded-md border-violet-200 bg-default text-center hover:bg-violet-50 dark:border-violet-800 dark:hover:bg-violet-950/40"
                          )}
                          data-testid="continue-with-google-button"
                          onClick={async () => {
                            posthog.capture("signup_google_button_clicked", {
                              has_token: !!token,
                              is_org_invite: isOrgInviteByLink,
                              org_slug: orgSlug,
                              has_prepopulated_username: !!prepopulateFormValues?.username,
                            });
                            setIsGoogleLoading(true);
                            const baseUrl = process.env.NEXT_PUBLIC_WEBAPP_URL;
                            const GOOGLE_AUTH_URL = `${baseUrl}/auth/sso/google`;
                            const searchQueryParams = new URLSearchParams();
                            if (prepopulateFormValues?.username) {
                              // If username is present we save it in query params to check for premium
                              searchQueryParams.set("username", prepopulateFormValues.username);
                              localStorage.setItem("username", prepopulateFormValues.username);
                            }
                            if (token && prepopulateFormValues?.email) {
                              searchQueryParams.set("email", prepopulateFormValues.email);
                            }
                            const url = searchQueryParams.toString()
                              ? `${GOOGLE_AUTH_URL}?${searchQueryParams.toString()}`
                              : GOOGLE_AUTH_URL;

                            router.push(url);
                          }}>
                          {t("continue_with_google")}
                        </Button>
                      </div>
                    )}

                    {isOutlookLoginEnabled && (
                      <div className="flex flex-col gap-2 md:flex-row">
                        <Button
                          color="secondary"
                          loading={isMicrosoftLoading}
                          disabled={isGoogleLoading}
                          CustomStartIcon={
                            <>
                              {/* eslint-disable @next/next/no-img-element */}
                              <img
                                className={classNames(
                                  "text-subtle mr-2 h-4 w-4",
                                  premiumUsername && "opacity-50"
                                )}
                                src="/microsoft-logo.svg"
                                alt="Continue with Microsoft Icon"
                              />
                            </>
                          }
                          className={classNames(
                            "w-full justify-center rounded-md border-violet-200 bg-default text-center hover:bg-violet-50 dark:border-violet-800 dark:hover:bg-violet-950/40"
                          )}
                          data-testid="continue-with-microsoft-button"
                          onClick={async () => {
                            posthog.capture("signup_microsoft_button_clicked", {
                              has_token: !!token,
                              is_org_invite: isOrgInviteByLink,
                              org_slug: orgSlug,
                              has_prepopulated_username: !!prepopulateFormValues?.username,
                            });
                            setIsMicrosoftLoading(true);
                            const baseUrl = process.env.NEXT_PUBLIC_WEBAPP_URL;
                            const MICROSOFT_AUTH_URL = `${baseUrl}/auth/sso/microsoft`;
                            const searchQueryParams = new URLSearchParams();
                            if (prepopulateFormValues?.username) {
                              // If username is present we save it in query params to check for premium
                              searchQueryParams.set("username", prepopulateFormValues.username);
                              localStorage.setItem("username", prepopulateFormValues.username);
                            }
                            if (token && prepopulateFormValues?.email) {
                              searchQueryParams.set("email", prepopulateFormValues.email);
                            }
                            const url = searchQueryParams.toString()
                              ? `${MICROSOFT_AUTH_URL}?${searchQueryParams.toString()}`
                              : MICROSOFT_AUTH_URL;

                            router.push(url);
                          }}>
                          {t("continue_with_microsoft")}
                        </Button>
                      </div>
                    )}

                    {(isGoogleLoginEnabled || isOutlookLoginEnabled) && (
                      <div>
                        <div className="relative flex items-center">
                          <div className="grow border-subtle border-t" />
                          <span className="mx-2 shrink font-normal text-sm text-subtle leading-none">
                            {t("or").toLocaleLowerCase()}
                          </span>
                          <div className="grow border-subtle border-t" />
                        </div>
                      </div>
                    )}

                    {/* Lower Row */}
                    <div className="flex flex-col gap-2">
                      <Button
                        color="secondary"
                        disabled={isGoogleLoading || isMicrosoftLoading}
                        className={classNames(
                          "w-full justify-center rounded-md border-violet-200 bg-default text-center hover:bg-violet-50 dark:border-violet-800 dark:hover:bg-violet-950/40"
                        )}
                        onClick={() => {
                          posthog.capture("signup_email_button_clicked", {
                            has_token: !!token,
                            is_org_invite: isOrgInviteByLink,
                            org_slug: orgSlug,
                          });
                          setDisplayEmailForm(true);
                        }}
                        data-testid="continue-with-email-button">
                        {t("continue_with_email")}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Already have an account & T&C */}
                <div className="mt-10 flex h-full flex-col justify-end pb-6 text-xs">
                  <div className="flex flex-col text-sm">
                    <div className="flex gap-1">
                      <p className="text-subtle">{t("already_have_account")}</p>
                      <Link href="/auth/login" className="text-emphasis hover:underline">
                        {t("sign_in")}
                      </Link>
                    </div>
                    <div className="text-subtle">
                      <ServerTrans
                        t={t}
                        i18nKey="signing_up_terms"
                        values={{ appName: APP_NAME }}
                        components={[
                          <Link
                            className="text-emphasis hover:underline"
                            key="terms"
                            href={`${WEBSITE_TERMS_URL}`}
                            target="_blank">
                            Terms
                          </Link>,
                          <Link
                            className="text-emphasis hover:underline"
                            key="privacy"
                            href={`${WEBSITE_PRIVACY_POLICY_URL}`}
                            target="_blank">
                            Privacy Policy.
                          </Link>,
                        ]}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="mx-auto hidden w-full max-w-2xl flex-col justify-between border-violet-100 bg-violet-50/70 pl-4 lg:flex lg:max-w-full lg:py-12 lg:pl-12 dark:border-violet-900/70 dark:bg-violet-950/20">
            <div className="hidden rounded-tl-2xl rounded-br-none rounded-bl-2xl border border-default border-r-0 border-dashed bg-black/3 lg:block lg:py-[6px] lg:pl-[6px] dark:bg-white/5">
              <img className="block dark:hidden" src="/mock-event-type-list.svg" alt="CalBook booking page" />
              {/* eslint-disable @next/next/no-img-element */}
              <img
                className="hidden dark:block"
                src="/mock-event-type-list-dark.svg"
                alt="CalBook booking page"
              />
            </div>
            <div className="mt-8 mr-12 hidden h-full w-full grid-cols-3 gap-4 overflow-hidden lg:grid">
              {FEATURES.map((feature, index) => (
                <div key={index} className="mb-8 flex max-w-52 flex-col leading-none sm:mb-0">
                  <div className="items-center text-emphasis">
                    <Icon name={feature.icon} className="mb-1 h-4 w-4" />
                    <span className="font-medium text-sm">{t(feature.title)}</span>
                  </div>
                  <div className="text-sm text-subtle">
                    <p>
                      {t(
                        feature.description,
                        feature.i18nOptions && {
                          ...feature.i18nOptions,
                        }
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <Toaster position="bottom-right" />
      </div>
    </>
  );
}
