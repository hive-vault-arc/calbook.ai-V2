type DeploymentEnvironment = Record<string, string | undefined>;

type DeploymentUrls = {
  nextAuthUrl: string | undefined;
  webappUrl: string | undefined;
  websiteUrl: string | undefined;
};

function isLocalUrl(value: string | undefined): boolean {
  if (!value) return false;

  try {
    const hostname = new URL(value).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  } catch {
    return false;
  }
}

function getVercelOrigin(env: DeploymentEnvironment): string | undefined {
  let hostname = env.VERCEL_BRANCH_URL || env.VERCEL_URL;
  if (env.VERCEL_ENV === "production") {
    hostname = env.VERCEL_PROJECT_PRODUCTION_URL || env.VERCEL_URL;
  }

  if (!hostname) return undefined;
  return `https://${hostname.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
}

function useHostedFallback(value: string | undefined, hostedOrigin: string | undefined): string | undefined {
  if (!hostedOrigin || (value && !isLocalUrl(value))) return value;
  return hostedOrigin;
}

export function resolveDeploymentUrls(env: DeploymentEnvironment): DeploymentUrls {
  const hostedOrigin = getVercelOrigin(env);
  const webappUrl = useHostedFallback(env.NEXT_PUBLIC_WEBAPP_URL, hostedOrigin);
  let websiteUrl = env.NEXT_PUBLIC_WEBSITE_URL;
  if (!websiteUrl || isLocalUrl(websiteUrl)) websiteUrl = webappUrl;

  let nextAuthUrl = env.NEXTAUTH_URL;
  if (!nextAuthUrl || isLocalUrl(nextAuthUrl)) {
    nextAuthUrl = undefined;
    if (webappUrl) nextAuthUrl = `${webappUrl.replace(/\/$/, "")}/api/auth`;
  }

  return { nextAuthUrl, webappUrl, websiteUrl };
}
