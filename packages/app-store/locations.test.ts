import { describe, expect, it } from "vitest";
import { getLocationValueForDB } from "./locations";

describe("getLocationValueForDB", () => {
  it("does not turn an empty location into an unconfigured video provider", () => {
    expect(getLocationValueForDB("", [])).toEqual({
      bookingLocation: "",
      conferenceCredentialId: undefined,
    });
  });

  it.each([
    "integrations:daily",
    "integrations:zoom",
    "integrations:google:meet",
    "https://meet.example.com/team",
  ])("preserves an explicitly chosen location: %s", (location) => {
    expect(getLocationValueForDB(location, []).bookingLocation).toBe(location);
  });
});
