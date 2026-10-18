import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "apps/web/modules/auth/login-view.tsx"), "utf8");

describe("login public environment configuration", () => {
  it("uses the server-provided signup flag instead of reading browser environment state", () => {
    expect(source).toContain('!isSignupDisabled && searchParams?.get("register") !== "false"');
    expect(source).not.toContain("process.env.NEXT_PUBLIC_DISABLE_SIGNUP");
  });
});
