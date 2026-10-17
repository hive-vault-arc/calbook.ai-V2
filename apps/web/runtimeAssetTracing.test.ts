import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { getRuntimeAssetTracing } from "./runtimeAssetTracing";

const appDirectory = path.dirname(fileURLToPath(import.meta.url));

describe("auth runtime template tracing", () => {
  it("traces outside the web app from the monorepo root", () => {
    const config = getRuntimeAssetTracing(appDirectory);
    expect(config.outputFileTracingRoot).toBe(path.resolve(appDirectory, "../.."));
    expect(
      existsSync(path.join(config.outputFileTracingRoot, "packages/emails/templates/confirm-email.html"))
    ).toBe(true);
  });

  it("includes only the sign-in template for the escaped NextAuth catch-all route", () => {
    const config = getRuntimeAssetTracing(appDirectory);
    const entries = Object.entries(config.outputFileTracingIncludes);
    expect(entries).toEqual([
      ["/api/auth/\\[\\.\\.\\.nextauth\\]", ["../../packages/emails/templates/confirm-email.html"]],
    ]);
    const template = path.resolve(appDirectory, entries[0][1][0]);
    expect(path.relative(config.outputFileTracingRoot, template).startsWith("..")).toBe(false);
    expect(readFileSync(template, "utf8")).toContain("{{signin_url}}");
  });

  it("wires the tracing settings into the actual Next.js config", () => {
    expect(readFileSync(path.join(appDirectory, "next.config.ts"), "utf8")).toContain(
      "...getRuntimeAssetTracing(__dirname)"
    );
  });
});
