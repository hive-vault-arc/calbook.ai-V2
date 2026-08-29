import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getResendApiKey: vi.fn<() => string | undefined>(),
  queryRaw: vi.fn(),
  verify: vi.fn(),
}));

vi.mock("@calcom/lib/getResendConfig", () => ({
  getResendApiKey: mocks.getResendApiKey,
}));

vi.mock("@calcom/lib/serverConfig", () => ({
  serverConfig: { transport: { host: "smtp.resend.com" } },
}));

vi.mock("@calcom/prisma", () => ({
  prisma: { $queryRaw: mocks.queryRaw },
}));

vi.mock("nodemailer", () => ({
  createTransport: () => ({ verify: mocks.verify }),
}));

import { GET } from "./route";

type HealthResponse = {
  checks: {
    email: {
      status: string;
      detail: string;
    };
  };
};

describe("GET /api/health email check", () => {
  beforeEach(() => {
    mocks.getResendApiKey.mockReturnValue("re_test");
    mocks.queryRaw.mockResolvedValue([{ result: 1 }]);
    mocks.verify.mockResolvedValue(true);
  });

  it("reports Resend as healthy only after transport verification succeeds", async () => {
    const response = await GET();
    const body = (await response.json()) as HealthResponse;

    expect(mocks.verify).toHaveBeenCalledOnce();
    expect(body.checks.email).toEqual({ status: "ok", detail: "Resend reachable" });
  });

  it("reports an error when Resend transport verification fails", async () => {
    mocks.verify.mockRejectedValueOnce(new Error("Authentication failed"));

    const response = await GET();
    const body = (await response.json()) as HealthResponse;

    expect(response.status).toBe(503);
    expect(body.checks.email).toEqual({ status: "error", detail: "Resend unreachable" });
  });
});
