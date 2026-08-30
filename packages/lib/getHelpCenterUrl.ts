import { HELP_CENTER_URL, WEBAPP_URL } from "./constants";

type HelpCenterConfig = {
  helpCenterUrl: string;
  webappUrl: string;
};

const defaultConfig: HelpCenterConfig = {
  helpCenterUrl: HELP_CENTER_URL,
  webappUrl: WEBAPP_URL,
};

function getHelpCenterUrl(path = "", config = defaultConfig): string {
  if (!config.helpCenterUrl) return config.webappUrl;

  const baseUrl = config.helpCenterUrl.endsWith("/") ? config.helpCenterUrl : `${config.helpCenterUrl}/`;
  return new URL(path.replace(/^\//, ""), baseUrl).toString();
}

export { getHelpCenterUrl };
export type { HelpCenterConfig };
