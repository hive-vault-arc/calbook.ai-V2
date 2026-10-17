import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { SignInResponse } from "next-auth/react";
import type { ReactNode } from "react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getEmailCooldown, useSignInEmail } from "./useSignInEmail";

const { signIn } = vi.hoisted(() => ({ signIn: vi.fn() }));
vi.mock("next-auth/react", () => ({ signIn }));
vi.mock("@calcom/lib/constants", () => ({ WEBAPP_URL: "https://calbook.test" }));

const success: SignInResponse = {
  ok: true,
  status: 200,
  error: null,
  url: "https://calbook.test/api/auth/verify-request?provider=email&type=email",
};
const account = { email: " User@Example.com ", username: " User " };

beforeEach(() => {
  signIn.mockReset();
  signIn.mockResolvedValue(success);
});
afterEach(cleanup);

describe("sign-in email feedback", () => {
  it("stays loading until the server acknowledges the send and prevents duplicate requests", async () => {
    let resolve: (value: SignInResponse) => void = () => {};
    signIn.mockReturnValue(
      new Promise<SignInResponse>((done) => {
        resolve = done;
      })
    );
    const { result } = renderHook(() => useSignInEmail(account), {
      wrapper: ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>,
    });
    expect(result.current.status).toBe("sending");
    await act(async () => {
      await result.current.send();
    });
    expect(signIn).toHaveBeenCalledTimes(1);
    expect(result.current.sentAt).toBeUndefined();
    await act(async () => {
      resolve(success);
    });
    expect(result.current.status).toBe("sent");
    expect(result.current.sentAt).toEqual(expect.any(Number));
    expect(signIn).toHaveBeenCalledWith("email", {
      email: "user@example.com",
      username: "user",
      redirect: false,
      callbackUrl: "https://calbook.test",
    });
  });

  it.each([
    undefined,
    { ...success, ok: false },
    { ...success, error: "EmailSignin", url: null },
    { ...success, url: "https://calbook.test/api/auth/signin?csrf=true" },
    { ...success, url: "https://calbook.test/" },
    { ...success, url: "https://calbook.test/api/auth/verify-request?provider=other&type=email" },
    { ...success, url: "http://[invalid" },
  ])("does not claim success for an unsuccessful or unexpected response: %j", async (response) => {
    signIn.mockResolvedValue(response);
    const { result } = renderHook(() => useSignInEmail(account));
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.sentAt).toBeUndefined();
  });

  it("allows retry after a network failure", async () => {
    signIn.mockRejectedValueOnce(new Error("Network unavailable"));
    const { result } = renderHook(() => useSignInEmail(account));
    await waitFor(() => expect(result.current.status).toBe("error"));
    await act(async () => {
      await result.current.send();
    });
    expect(result.current.status).toBe("sent");
    expect(signIn).toHaveBeenCalledTimes(2);
  });

  it("does not automatically resend for a server-sent premium email", async () => {
    const { result } = renderHook(() => useSignInEmail({ ...account, autoSend: false }));
    expect(signIn).not.toHaveBeenCalled();
    await act(async () => {
      await result.current.send();
    });
    expect(result.current.status).toBe("sent");
  });

  it("does not send without an account identifier", async () => {
    const { result } = renderHook(() => useSignInEmail({ email: account.email }));
    await act(async () => {
      await result.current.send();
    });
    expect(signIn).not.toHaveBeenCalled();
  });
});

describe("email cooldown", () => {
  it("uses the actual send timestamp and rounds up remaining seconds", () => {
    expect(getEmailCooldown("1000", 1000)).toBe(30);
    expect(getEmailCooldown("1000", 29_001)).toBe(2);
    expect(getEmailCooldown("1000", 31_000)).toBe(0);
    expect(getEmailCooldown("1000", 40_000)).toBe(0);
  });
  it.each([
    null,
    "",
    "invalid",
    "Infinity",
    "-1",
    "2000",
  ])("ignores invalid or future timestamps: %s", (timestamp) => {
    expect(getEmailCooldown(timestamp, 1000)).toBe(0);
  });
});
