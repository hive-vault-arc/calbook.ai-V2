import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findSecretTypes, isProhibitedEnvFile } from "./secret-patterns.mjs";

describe("deployment secret patterns", () => {
  it("detects a Neon database credential without exposing it in output", () => {
    const content = [
      "DATABASE_URL=postgresql://owner:",
      "npg_exampleSecret123",
      "@ep-example.neon.tech/db",
    ].join("");

    assert.deepEqual(findSecretTypes(content), ["Neon database credential"]);
  });

  it("detects a Render deploy hook", () => {
    const content = ["https://api.render.com/deploy/", "srv-example123", "?key=exampleSecret123"].join("");

    assert.deepEqual(findSecretTypes(content), ["Render deploy hook"]);
  });

  it("does not flag documented placeholders", () => {
    const content = [
      "DATABASE_URL=postgresql://user:password@database.example.com/calbook",
      "RENDER_DEPLOY_HOOK=https://api.render.com/deploy/<service>?key=<secret>",
      "NEXTAUTH_SECRET=generate-a-unique-secret",
    ].join("\n");

    assert.deepEqual(findSecretTypes(content), []);
  });

  it("blocks deployment environment files while allowing templates", () => {
    assert.equal(isProhibitedEnvFile(".env.production"), true);
    assert.equal(isProhibitedEnvFile("apps/web/.env.preview.local"), true);
    assert.equal(isProhibitedEnvFile(".env.production.template"), false);
    assert.equal(isProhibitedEnvFile("apps/web/.env.example"), false);
  });
});
