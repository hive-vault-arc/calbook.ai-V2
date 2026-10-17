import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createEmailSignInProvider, EMAIL_SIGN_IN_MAX_AGE_SECONDS } from "./emailSignInProvider";

describe("email sign-in lifetime", () => {
  it("configures NextAuth to expire newly issued links after exactly ten minutes", () => {
    const provider = createEmailSignInProvider();
    expect(provider.type).toBe("email");
    expect(provider.options.maxAge).toBe(600);
    expect(provider.options.maxAge).toBe(EMAIL_SIGN_IN_MAX_AGE_SECONDS);
  });

  it("registers the tested email provider in the real auth options", () => {
    const directory = path.dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(path.join(directory, "next-auth-options.ts"), "utf8");
    expect(source).toContain("providers.push(createEmailSignInProvider())");
    expect(source).not.toContain("maxAge: 10 * 60 * 60");
  });
});
