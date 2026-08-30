import { describe, expect, it } from "vitest";
import { getHelpCenterUrl } from "./getHelpCenterUrl";

describe("getHelpCenterUrl", () => {
  it("keeps help links inside the application until a help center is configured", () => {
    expect(
      getHelpCenterUrl("booking-email-delivery", {
        helpCenterUrl: "",
        webappUrl: "https://app.calbook.test",
      })
    ).toBe("https://app.calbook.test");
  });

  it("builds a help-center URL from the configured CalBook help center", () => {
    expect(
      getHelpCenterUrl("/event-types/booking-questions", {
        helpCenterUrl: "https://help.calbook.test/docs",
        webappUrl: "https://app.calbook.test",
      })
    ).toBe("https://help.calbook.test/docs/event-types/booking-questions");
  });
});
