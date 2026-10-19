import { cleanup, render, screen } from "@testing-library/react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Verify from "./verify-view";

const mocks = vi.hoisted(() => ({
  state: { status: "sending", sentAt: undefined as number | undefined, send: vi.fn() },
  router: { replace: vi.fn() },
  params: new URLSearchParams(),
}));
vi.mock("./lib/useSignInEmail", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./lib/useSignInEmail")>()),
  useSignInEmail: () => mocks.state,
}));
vi.mock("@calcom/lib/hooks/useLocale", () => ({ useLocale: () => ({ t: (key: string) => key }) }));
vi.mock("@calcom/lib/hooks/useRouterQuery", () => ({
  useRouterQuery: () => ({ email: "test@example.com", username: "test" }),
}));
vi.mock("@calcom/lib/hooks/useCompatSearchParams", () => ({ useCompatSearchParams: () => mocks.params }));
vi.mock("next/navigation", () => ({ usePathname: () => "/auth/verify", useRouter: () => mocks.router }));
vi.mock("@calcom/ui/components/button", () => ({
  Button: ({
    children,
    href,
    disabled,
    loading,
    onClick,
  }: ButtonHTMLAttributes<HTMLButtonElement> & {
    children: ReactNode;
    href?: string;
    loading?: boolean;
  }) =>
    href ? (
      <a href={href}>{children}</a>
    ) : (
      <button type="button" disabled={disabled} aria-busy={loading} onClick={onClick}>
        {children}
      </button>
    ),
}));

beforeEach(() => {
  mocks.state.status = "sending";
  mocks.state.sentAt = undefined;
  mocks.params = new URLSearchParams();
  mocks.router.replace.mockReset();
});
afterEach(cleanup);

describe("sign-in email page", () => {
  it("shows pending feedback and disables resend while sending", () => {
    render(<Verify />);
    expect(screen.getByRole("heading").textContent).toBe("sending");
    expect(screen.queryByText("email_sent")).toBeNull();
    expect(screen.getByRole("button").hasAttribute("disabled")).toBe(true);
  });

  it("shows a persistent error instead of claiming delivery", () => {
    mocks.state.status = "error";
    render(<Verify />);
    expect(screen.getByRole("heading").textContent).toBe("email_not_sent");
    expect(screen.getByRole("alert").textContent).toContain("try_again");
    expect(screen.queryByText("email_sent")).toBeNull();
    expect(screen.getByRole("button").hasAttribute("disabled")).toBe(false);
  });

  it("shows success and starts cooldown only after an acknowledged send", () => {
    mocks.state.status = "sent";
    mocks.state.sentAt = Date.now();
    render(<Verify />);
    expect(screen.getByRole("heading").textContent).toBe("check_your_inbox");
    expect(screen.getByRole("status").textContent).toContain("email_sent");
    expect(screen.getByRole("button").hasAttribute("disabled")).toBe(true);
    expect(mocks.router.replace).toHaveBeenCalledWith(expect.stringContaining("/auth/verify?t="));
  });

  it("uses a real Gmail URL instead of encoding the whole URL as a relative path", () => {
    render(<Verify EMAIL_FROM="CalBook <hello@example.com>" />);
    const target = new URL(screen.getByRole("link").getAttribute("href") ?? "");
    expect(target.origin).toBe("https://mail.google.com");
    expect(decodeURIComponent(target.hash)).toContain("from:CalBook <hello@example.com>");
  });
});
