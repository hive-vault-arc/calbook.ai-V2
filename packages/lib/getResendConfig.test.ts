import { describe, expect, it } from "vitest";
import { getResendApiKey, getResendFromAddress } from "./getResendConfig";

describe("getResendConfig", () => {
  it("prefers the canonical Resend key", () => {
    expect(
      getResendApiKey({
        RESEND_API_KEY: "re_canonical",
        NEXT_RESEND_API_KEY: "re_alias",
      } as NodeJS.ProcessEnv)
    ).toBe("re_canonical");
  });

  it("falls back to the supported server-side key alias", () => {
    expect(getResendApiKey({ NEXT_RESEND_API_KEY: "re_alias" } as NodeJS.ProcessEnv)).toBe("re_alias");
  });

  it("returns no key when Resend is not configured", () => {
    expect(getResendApiKey({} as NodeJS.ProcessEnv)).toBeUndefined();
  });

  it("prefers the dedicated Resend sender address", () => {
    expect(
      getResendFromAddress({
        RESEND_FROM: "bookings@calbook.test",
        EMAIL_FROM: "legacy@calbook.test",
      } as NodeJS.ProcessEnv)
    ).toBe("bookings@calbook.test");
  });

  it("falls back to the existing global sender address", () => {
    expect(getResendFromAddress({ EMAIL_FROM: "legacy@calbook.test" } as NodeJS.ProcessEnv)).toBe(
      "legacy@calbook.test"
    );
  });
});
