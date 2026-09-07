import process from "node:process";
import { getGoogleCalendarOAuthCredentials } from "@calcom/lib/googleCalendarOAuth";

const googleCalendarOAuthCredentials = getGoogleCalendarOAuthCredentials(process.env.GOOGLE_API_CREDENTIALS);
const GOOGLE_API_CREDENTIALS = process.env.GOOGLE_API_CREDENTIALS || "{}";
const GOOGLE_CLIENT_ID = googleCalendarOAuthCredentials?.web.client_id;
const GOOGLE_CLIENT_SECRET = googleCalendarOAuthCredentials?.web.client_secret;
const GOOGLE_LOGIN_ENABLED = process.env.GOOGLE_LOGIN_ENABLED === "true";
const IS_GOOGLE_LOGIN_ENABLED = !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_LOGIN_ENABLED);

export {
  GOOGLE_API_CREDENTIALS,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_LOGIN_ENABLED,
  IS_GOOGLE_LOGIN_ENABLED,
};
