type AppStoreBrandingInput = {
  author: string;
  email?: string;
  website?: string;
  appName: string;
  supportEmail: string;
  webappUrl: string;
};

type AppStoreBranding = {
  author: string;
  email?: string;
  website?: string;
  isCalBookManaged: boolean;
};

const LEGACY_CAL_PUBLISHERS = /^(cal\.com(?:,? inc\.?)?|cal\.diy)$/i;

function getAppStoreBranding({
  author,
  email,
  website,
  appName,
  supportEmail,
  webappUrl,
}: AppStoreBrandingInput): AppStoreBranding {
  if (!LEGACY_CAL_PUBLISHERS.test(author.trim())) {
    return { author, email, website, isCalBookManaged: false };
  }

  return {
    author: appName,
    email: supportEmail || undefined,
    website: webappUrl,
    isCalBookManaged: true,
  };
}

function normalizeAppStoreContent(content: string, appName: string, webappUrl: string): string {
  return content
    .replaceAll("https://app.cal.com", webappUrl)
    .replaceAll("https://cal.com", webappUrl)
    .replaceAll("http://app.cal.com", webappUrl)
    .replaceAll("http://cal.com", webappUrl)
    .replaceAll("Cal.diy", appName)
    .replaceAll("Cal.com", appName);
}

export { getAppStoreBranding, normalizeAppStoreContent };
export type { AppStoreBranding };
