const RECRUITMENT_INTEGRATION_SLUGS: ReadonlySet<string> = new Set([
  "google-calendar",
  "office365-calendar",
  "google-meet",
  "msteams",
  "zoom",
]);

export const isCuratedRecruitmentIntegration = (slug: string): boolean =>
  RECRUITMENT_INTEGRATION_SLUGS.has(slug);

export const getCuratedRecruitmentIntegrations = <T extends { slug: string }>(apps: T[]): T[] =>
  apps.filter((app) => isCuratedRecruitmentIntegration(app.slug));
