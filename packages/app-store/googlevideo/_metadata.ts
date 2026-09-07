import process from "node:process";
import { isGoogleCalendarOAuthConfigured } from "@calcom/lib/googleCalendarOAuth";
import type { AppMeta } from "@calcom/types/App";

export const metadata = {
  name: "Google Meet",
  description:
    "Google Meet is Google's web-based video conferencing platform, designed to compete with major conferencing platforms.",
  installed: isGoogleCalendarOAuthConfigured(process.env.GOOGLE_API_CREDENTIALS),
  slug: "google-meet",
  category: "conferencing",
  categories: ["conferencing"],
  type: "google_video",
  title: "Google Meet",
  variant: "conferencing",
  logo: "logo.webp",
  publisher: "CalBook.ai",
  url: process.env.WEBAPP_URL ?? "",
  isGlobal: false,
  email: process.env.SUPPORT_MAIL_ADDRESS ?? "",
  appData: {
    location: {
      linkType: "dynamic",
      type: "integrations:google:meet",
      label: "Google Meet",
    },
  },
  dirName: "googlevideo",
  dependencies: ["google-calendar"],
  isOAuth: false,
} as AppMeta;

export default metadata;
