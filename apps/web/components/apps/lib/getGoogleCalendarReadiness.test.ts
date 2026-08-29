import { describe, expect, it } from "vitest";
import { getGoogleCalendarReadiness } from "./getGoogleCalendarReadiness";

describe("getGoogleCalendarReadiness", () => {
  it("requires platform setup when Google OAuth is unavailable", () => {
    expect(getGoogleCalendarReadiness({ googleCalendarConfigured: false, connectedCalendarCount: 0 })).toBe(
      "needsPlatformSetup"
    );
  });

  it("allows users to connect after platform setup", () => {
    expect(getGoogleCalendarReadiness({ googleCalendarConfigured: true, connectedCalendarCount: 0 })).toBe(
      "readyToConnect"
    );
  });

  it("reports an existing calendar connection regardless of current platform setup", () => {
    expect(getGoogleCalendarReadiness({ googleCalendarConfigured: false, connectedCalendarCount: 1 })).toBe(
      "connected"
    );
  });
});
