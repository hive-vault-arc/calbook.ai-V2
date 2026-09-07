import { describe, expect, it } from "vitest";
import { getGoogleCalendarOAuthCredentials, isGoogleCalendarOAuthConfigured } from "./googleCalendarOAuth";

const validGoogleOAuthCredentials = JSON.stringify({
  web: {
    client_id: "test-client-id",
    client_secret: "test-client-secret",
    redirect_uris: ["http://localhost:3000/api/integrations/googlecalendar/callback"],
  },
});

describe("Google Calendar OAuth configuration", () => {
  it("accepts a complete web OAuth configuration", () => {
    expect(isGoogleCalendarOAuthConfigured(validGoogleOAuthCredentials)).toBe(true);
    expect(getGoogleCalendarOAuthCredentials(validGoogleOAuthCredentials)?.web.client_id).toBe(
      "test-client-id"
    );
  });

  it.each([
    undefined,
    "{}",
    "{not-json}",
    JSON.stringify({ web: { client_id: "client" } }),
    JSON.stringify({ web: { client_id: "client", client_secret: "secret", redirect_uris: [] } }),
  ])("rejects an incomplete configuration", (credentials) => {
    expect(isGoogleCalendarOAuthConfigured(credentials)).toBe(false);
    expect(getGoogleCalendarOAuthCredentials(credentials)).toBeNull();
  });
});
