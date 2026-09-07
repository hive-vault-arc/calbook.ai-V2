import process from "node:process";
import { isGoogleCalendarOAuthConfigured } from "@calcom/lib/googleCalendarOAuth";
import type { AppMeta } from "@calcom/types/App";

export const metadata = {
  name: "Google Calendar",
  description:
    "Google Calendar is a time management and scheduling service developed by Google. Allows users to create and edit events, with options available for type and time. Available to anyone that has a Gmail account on both mobile and web versions.",
  installed: isGoogleCalendarOAuthConfigured(process.env.GOOGLE_API_CREDENTIALS),
  type: "google_calendar",
  title: "Google Calendar",
  variant: "calendar",
  category: "calendar",
  categories: ["calendar"],
  logo: "icon.svg",
  publisher: "CalBook.ai",
  slug: "google-calendar",
  url: process.env.WEBAPP_URL ?? "",
  email: process.env.SUPPORT_MAIL_ADDRESS ?? "",
  dirName: "googlecalendar",
  isOAuth: true,
  delegationCredential: {
    // This is unused at the moment but should be used in future
    // For now, we have hardcoded imports in the codebase that are supported with Google Workspace(i.e. Google Calendar and Google Meet)
    workspacePlatformSlug: "google",
  },
} as AppMeta;

export default metadata;
