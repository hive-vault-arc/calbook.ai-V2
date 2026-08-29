export type GoogleCalendarReadiness = "connected" | "needsPlatformSetup" | "readyToConnect";

export function getGoogleCalendarReadiness({
  googleCalendarConfigured,
  connectedCalendarCount,
}: {
  googleCalendarConfigured: boolean;
  connectedCalendarCount: number;
}): GoogleCalendarReadiness {
  if (connectedCalendarCount > 0) return "connected";
  if (!googleCalendarConfigured) return "needsPlatformSetup";
  return "readyToConnect";
}
