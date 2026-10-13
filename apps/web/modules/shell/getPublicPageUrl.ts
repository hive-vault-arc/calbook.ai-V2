import { WEBAPP_URL } from "@calcom/lib/constants";

export function getPublicPageUrl(orgAwareUsername?: string | null, username?: string | null): string | null {
  const slug = orgAwareUsername?.trim() || username?.trim();
  return slug ? `${WEBAPP_URL}/${slug}` : null;
}
