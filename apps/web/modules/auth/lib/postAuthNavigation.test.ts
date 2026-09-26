import { describe, expect, it, vi } from "vitest";
import { navigateAfterEmailVerification, navigateAfterLogin } from "./postAuthNavigation";

describe("post-auth navigation", () => {
  it("performs a full navigation to the safe login callback", () => {
    const browserLocation = {
      assign: vi.fn(),
      replace: vi.fn(),
    };

    navigateAfterLogin("https://calbook.example/home", browserLocation);

    expect(browserLocation.assign).toHaveBeenCalledWith("https://calbook.example/home");
    expect(browserLocation.replace).not.toHaveBeenCalled();
  });

  it("reloads the root route after email verification", () => {
    const browserLocation = {
      assign: vi.fn(),
      replace: vi.fn(),
    };

    navigateAfterEmailVerification(browserLocation);

    expect(browserLocation.replace).toHaveBeenCalledWith("/");
    expect(browserLocation.assign).not.toHaveBeenCalled();
  });
});
