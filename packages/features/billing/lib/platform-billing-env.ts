import process from "node:process";

export type PlatformBillingEnv = {
  privateKey: string | undefined;
  webhookSecret: string | undefined;
  proMonthlyPriceId: string | undefined;
  proAnnualPriceId: string | undefined;
  enterpriseMonthlyPriceId: string | undefined;
  enterpriseAnnualPriceId: string | undefined;
};

export type PlatformBillingReadiness = {
  ready: boolean;
  missing: string[];
  invalid: string[];
};

function value(primary: string | undefined, fallback?: string): string | undefined {
  return primary || fallback || undefined;
}

export function getPlatformBillingEnv(env: NodeJS.ProcessEnv = process.env): PlatformBillingEnv {
  return {
    privateKey: env.STRIPE_PRIVATE_KEY,
    webhookSecret: value(env.STRIPE_PLATFORM_BILLING_WEBHOOK_SECRET, env.STRIPE_WEBHOOK_SECRET_BILLING),
    proMonthlyPriceId: value(env.STRIPE_PLATFORM_PRO_MONTHLY_PRICE_ID, env.STRIPE_ORG_MONTHLY_PRICE_ID),
    proAnnualPriceId: value(env.STRIPE_PLATFORM_PRO_ANNUAL_PRICE_ID, env.STRIPE_ORG_ANNUAL_PRICE_ID),
    enterpriseMonthlyPriceId: env.STRIPE_PLATFORM_ENTERPRISE_MONTHLY_PRICE_ID,
    enterpriseAnnualPriceId: env.STRIPE_PLATFORM_ENTERPRISE_ANNUAL_PRICE_ID,
  };
}

export function getPlatformBillingReadiness(env: NodeJS.ProcessEnv = process.env): PlatformBillingReadiness {
  const config = getPlatformBillingEnv(env);
  const required = {
    STRIPE_PRIVATE_KEY: config.privateKey,
    STRIPE_PLATFORM_BILLING_WEBHOOK_SECRET: config.webhookSecret,
    STRIPE_PLATFORM_PRO_MONTHLY_PRICE_ID: config.proMonthlyPriceId,
    STRIPE_PLATFORM_PRO_ANNUAL_PRICE_ID: config.proAnnualPriceId,
  };
  const missing = Object.entries(required)
    .filter(([, configuredValue]) => !configuredValue)
    .map(([key]) => key);
  const invalid: string[] = [];

  if (config.privateKey && !/^sk_(test|live)_/.test(config.privateKey)) invalid.push("STRIPE_PRIVATE_KEY");
  if (config.webhookSecret && !config.webhookSecret.startsWith("whsec_"))
    invalid.push("STRIPE_PLATFORM_BILLING_WEBHOOK_SECRET");

  const prices = {
    STRIPE_PLATFORM_PRO_MONTHLY_PRICE_ID: config.proMonthlyPriceId,
    STRIPE_PLATFORM_PRO_ANNUAL_PRICE_ID: config.proAnnualPriceId,
    STRIPE_PLATFORM_ENTERPRISE_MONTHLY_PRICE_ID: config.enterpriseMonthlyPriceId,
    STRIPE_PLATFORM_ENTERPRISE_ANNUAL_PRICE_ID: config.enterpriseAnnualPriceId,
  };
  for (const [key, priceId] of Object.entries(prices)) {
    if (priceId && !priceId.startsWith("price_")) invalid.push(key);
  }

  return { ready: missing.length === 0 && invalid.length === 0, missing, invalid };
}
