import { describe, expect, it } from "vitest";
import { getAppStoreBranding } from "./appStoreBranding";

const calBookContext = {
  appName: "CalBook.ai",
  supportEmail: "support@calbook.test",
  webappUrl: "https://app.calbook.test",
};

describe("getAppStoreBranding", () => {
  it.each([
    "Cal.com, Inc.",
    "Cal.com, Inc",
    "Cal.diy",
  ])("presents %s as a CalBook-managed listing", (author) => {
    expect(
      getAppStoreBranding({
        ...calBookContext,
        author,
        email: "help@cal.com",
        website: "https://cal.com",
      })
    ).toEqual({
      author: "CalBook.ai",
      email: "support@calbook.test",
      website: "https://app.calbook.test",
      isCalBookManaged: true,
    });
  });

  it("preserves an external integration's publisher and support details", () => {
    expect(
      getAppStoreBranding({
        ...calBookContext,
        author: "Google",
        email: "support@google.test",
        website: "https://workspace.google.com",
      })
    ).toEqual({
      author: "Google",
      email: "support@google.test",
      website: "https://workspace.google.com",
      isCalBookManaged: false,
    });
  });

  it("omits the listing contact when a managed catalog has no support mailbox configured", () => {
    expect(
      getAppStoreBranding({
        ...calBookContext,
        author: "Cal.diy",
        email: "help@cal.com",
        supportEmail: "",
      }).email
    ).toBeUndefined();
  });
});
