type GoogleCalendarOAuthWebCredentials = {
  client_id: string;
  client_secret: string;
  redirect_uris: string[];
};

type GoogleCalendarOAuthCredentials = {
  web: GoogleCalendarOAuthWebCredentials;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getGoogleCalendarOAuthCredentials(value: string | undefined): GoogleCalendarOAuthCredentials | null {
  if (!value) return null;

  try {
    const parsed: unknown = JSON.parse(value);
    if (!isRecord(parsed) || !isRecord(parsed.web)) return null;

    const { client_id, client_secret, redirect_uris } = parsed.web;
    if (typeof client_id !== "string" || !client_id) return null;
    if (typeof client_secret !== "string" || !client_secret) return null;
    if (
      !Array.isArray(redirect_uris) ||
      redirect_uris.length === 0 ||
      redirect_uris.some((uri) => typeof uri !== "string" || !uri)
    ) {
      return null;
    }

    return {
      web: {
        client_id,
        client_secret,
        redirect_uris,
      },
    };
  } catch {
    return null;
  }
}

function isGoogleCalendarOAuthConfigured(value: string | undefined): boolean {
  return getGoogleCalendarOAuthCredentials(value) !== null;
}

export { getGoogleCalendarOAuthCredentials, isGoogleCalendarOAuthConfigured };
export type { GoogleCalendarOAuthCredentials };
