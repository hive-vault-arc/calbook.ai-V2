import path from "node:path";
import type { NextConfig } from "next";

export function getRuntimeAssetTracing(appDirectory: string) {
  return {
    outputFileTracingRoot: path.resolve(appDirectory, "../.."),
    outputFileTracingIncludes: {
      // This template is read from disk at runtime rather than imported into the auth bundle.
      "/api/auth/\\[\\.\\.\\.nextauth\\]": ["../../packages/emails/templates/confirm-email.html"],
    },
  } satisfies Pick<NextConfig, "outputFileTracingRoot" | "outputFileTracingIncludes">;
}
