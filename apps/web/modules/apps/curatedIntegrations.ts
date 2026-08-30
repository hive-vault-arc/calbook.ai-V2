const RECRUITMENT_INTEGRATION_SLUGS: ReadonlySet<string> = new Set([
  "google-calendar",
  "office365-calendar",
  "google-meet",
  "msteams",
  "zoom",
]);

export const getCuratedRecruitmentIntegrations = <T extends { slug: string }>(apps: T[]): T[] => {
  return apps.filter((app) => RECRUITMENT_INTEGRATION_SLUGS.has(app.slug));
};
