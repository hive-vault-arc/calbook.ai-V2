import { describe, expect, it } from "vitest";
import { resolveDeploymentUrls } from "./deploymentOrigin";

describe("resolveDeploymentUrls", () => {
  it("replaces localhost URLs with the Vercel production origin", () => {
    expect(
      resolveDeploymentUrls({
        VERCEL_ENV: "production",
        VERCEL_PROJECT_PRODUCTION_URL: "calbook-ai-v2-web.vercel.app",
        VERCEL_URL: "calbook-ai-v2-web-random.vercel.app",
        NEXT_PUBLIC_WEBAPP_URL: "http://localhost:3000",
        NEXT_PUBLIC_WEBSITE_URL: "http://127.0.0.1:3000",
        NEXTAUTH_URL: "http://localhost:3000/api/auth",
      })
    ).toEqual({
      webappUrl: "https://calbook-ai-v2-web.vercel.app",
      websiteUrl: "https://calbook-ai-v2-web.vercel.app",
      nextAuthUrl: "https://calbook-ai-v2-web.vercel.app/api/auth",
    });
  });

  it("uses the stable Vercel branch URL for preview deployments", () => {
    expect(
      resolveDeploymentUrls({
        VERCEL_ENV: "preview",
        VERCEL_BRANCH_URL: "calbook-ai-v2-web-git-release.vercel.app",
        VERCEL_URL: "calbook-ai-v2-web-random.vercel.app",
      })
    ).toEqual({
      webappUrl: "https://calbook-ai-v2-web-git-release.vercel.app",
      websiteUrl: "https://calbook-ai-v2-web-git-release.vercel.app",
      nextAuthUrl: "https://calbook-ai-v2-web-git-release.vercel.app/api/auth",
    });
  });

  it("preserves explicitly configured public and custom-domain URLs", () => {
    expect(
      resolveDeploymentUrls({
        VERCEL_ENV: "production",
        VERCEL_PROJECT_PRODUCTION_URL: "calbook-ai-v2-web.vercel.app",
        NEXT_PUBLIC_WEBAPP_URL: "https://app.example.com",
        NEXT_PUBLIC_WEBSITE_URL: "https://www.example.com",
        NEXTAUTH_URL: "https://auth.example.com/api/auth",
      })
    ).toEqual({
      webappUrl: "https://app.example.com",
      websiteUrl: "https://www.example.com",
      nextAuthUrl: "https://auth.example.com/api/auth",
    });
  });

  it("derives stale local companion URLs from a configured custom app domain", () => {
    expect(
      resolveDeploymentUrls({
        VERCEL_ENV: "production",
        VERCEL_PROJECT_PRODUCTION_URL: "calbook-ai-v2-web.vercel.app",
        NEXT_PUBLIC_WEBAPP_URL: "https://app.example.com",
        NEXT_PUBLIC_WEBSITE_URL: "http://localhost:3000",
        NEXTAUTH_URL: "http://localhost:3000/api/auth",
      })
    ).toEqual({
      webappUrl: "https://app.example.com",
      websiteUrl: "https://app.example.com",
      nextAuthUrl: "https://app.example.com/api/auth",
    });
  });

  it("preserves localhost for non-Vercel development", () => {
    expect(
      resolveDeploymentUrls({
        NEXT_PUBLIC_WEBAPP_URL: "http://localhost:3000",
        NEXTAUTH_URL: "http://localhost:3000/api/auth",
      })
    ).toEqual({
      webappUrl: "http://localhost:3000",
      websiteUrl: "http://localhost:3000",
      nextAuthUrl: "http://localhost:3000/api/auth",
    });
  });
});
