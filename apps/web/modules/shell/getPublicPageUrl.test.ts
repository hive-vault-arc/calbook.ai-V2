import { describe, expect, it } from "vitest";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { getPublicPageUrl } from "./getPublicPageUrl";

describe("getPublicPageUrl", () => {
  it("uses the organization-aware username when available", () => {
    expect(getPublicPageUrl("team-member", "personal-name")).toBe(`${WEBAPP_URL}/team-member`);
  });

  it("falls back to the personal username", () => {
    expect(getPublicPageUrl(null, "personal-name")).toBe(`${WEBAPP_URL}/personal-name`);
  });

  it("does not create a link when the username is not available", () => {
    expect(getPublicPageUrl(null, null)).toBeNull();
    expect(getPublicPageUrl(undefined, "   ")).toBeNull();
  });
});
