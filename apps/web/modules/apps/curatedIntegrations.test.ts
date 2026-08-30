import { describe, expect, it } from "vitest";
import { getCuratedRecruitmentIntegrations, isCuratedRecruitmentIntegration } from "./curatedIntegrations";

describe("getCuratedRecruitmentIntegrations", () => {
  it("shows only the calendar and video integrations needed for recruitment", () => {
    const apps = [
      { slug: "google-calendar" },
      { slug: "google-meet" },
      { slug: "msteams" },
      { slug: "zoom" },
      { slug: "zapier" },
    ];

    expect(getCuratedRecruitmentIntegrations(apps)).toEqual([
      { slug: "google-calendar" },
      { slug: "google-meet" },
      { slug: "msteams" },
      { slug: "zoom" },
    ]);
  });

  it("does not treat unrelated provider routes as part of the public catalog", () => {
    expect(isCuratedRecruitmentIntegration("zapier")).toBe(false);
    expect(isCuratedRecruitmentIntegration("google-calendar")).toBe(true);
  });
});
