import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getScrollFillProgress, LandingScrollMotion } from "./LandingScrollMotion";

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  );
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("landing scroll fill", () => {
  it("clamps progress as a heading moves through the viewport", () => {
    expect(getScrollFillProgress(850, 1000)).toBe(0);
    expect(getScrollFillProgress(575, 1000)).toBe(0.5);
    expect(getScrollFillProgress(300, 1000)).toBe(1);
  });

  it("does not listen for scroll events without a fill heading", () => {
    const addEventListener = vi.spyOn(window, "addEventListener");
    render(<LandingScrollMotion />);

    expect(addEventListener).not.toHaveBeenCalledWith("scroll", expect.any(Function), expect.anything());
  });

  it("fills headings immediately when reduced motion is preferred", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    );
    const heading = document.createElement("h2");
    heading.dataset.calbookScrollFill = "";
    document.body.appendChild(heading);

    render(<LandingScrollMotion />);

    expect(heading.style.getPropertyValue("--scroll-progress")).toBe("1");
    heading.remove();
  });
});
