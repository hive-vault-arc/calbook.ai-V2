// @vitest-environment node
import type { GetServerSidePropsContext } from "next";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ inspect: vi.fn(), session: vi.fn(), flag: vi.fn() }));
vi.mock("@calcom/features/auth/beta/BetaInvitationService", () => ({
  BetaInvitationService: class {
    inspect = mocks.inspect;
  },
}));
vi.mock("@calcom/features/auth/lib/getServerSession", () => ({ getServerSession: mocks.session }));
vi.mock("@calcom/features/flags/features.repository", () => ({
  FeaturesRepository: class {
    checkIfFeatureIsEnabledGlobally = mocks.flag;
  },
}));
vi.mock("@calcom/prisma", () => ({ default: {} }));
vi.mock("@server/lib/constants", () => ({ IS_GOOGLE_LOGIN_ENABLED: true }));

import { getServerSideProps } from "./getServerSideProps";

const context = (query: GetServerSidePropsContext["query"]): GetServerSidePropsContext =>
  ({ query, req: {} }) as GetServerSidePropsContext;
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_DISABLE_SIGNUP", "true");
  mocks.flag.mockResolvedValue(false);
  mocks.session.mockResolvedValue(null);
  mocks.inspect.mockResolvedValue({ email: "approved@example.test" });
});
afterEach(() => vi.unstubAllEnvs());

it("keeps public signup on the waitlist", async () => {
  expect(await getServerSideProps(context({}))).toMatchObject({
    redirect: { destination: "https://tally.so/r/9qbzp5" },
  });
});

it("opens email-bound signup for an approved invitation while public signup is closed", async () => {
  const betaToken = "a".repeat(64);
  expect(await getServerSideProps(context({ betaToken }))).toMatchObject({
    props: {
      betaToken,
      isGoogleLoginEnabled: false,
      prepopulateFormValues: { email: "approved@example.test" },
    },
  });
});

it("rejects an expired invitation", async () => {
  mocks.inspect.mockResolvedValue(null);
  expect(await getServerSideProps(context({ betaToken: "a".repeat(64) }))).toMatchObject({
    redirect: { destination: expect.stringContaining("Invalid%20or%20expired") },
  });
});

it("rejects mixed team and beta invitations", async () => {
  expect(await getServerSideProps(context({ betaToken: "a".repeat(64), token: "team-token" }))).toMatchObject(
    {
      redirect: { destination: expect.stringContaining("Invalid%20or%20expired") },
    }
  );
  expect(mocks.inspect).not.toHaveBeenCalled();
});

it("does not override the global emergency signup switch", async () => {
  mocks.flag.mockImplementation(async (key: string) => key === "disable-signup");
  expect(await getServerSideProps(context({ betaToken: "a".repeat(64) }))).toHaveProperty("redirect");
  expect(mocks.inspect).not.toHaveBeenCalled();
});
