import { act } from "@testing-library/react";
import type { Root } from "react-dom/client";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useHydrationReady } from "./useHydrationReady";

const roots: Root[] = [];

function ThemeContent({ isEmbedMode = false }: { isEmbedMode?: boolean }) {
  const hydrationReady = useHydrationReady();
  return (
    <>
      {hydrationReady && !isEmbedMode && <style>{".dark { color-scheme: dark; }"}</style>}
      <p data-testid="content">Sign in</p>
    </>
  );
}

afterEach(async () => {
  await act(async () => {
    for (const root of roots.splice(0)) root.unmount();
  });
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("theme hydration readiness", () => {
  it("hydrates without replacing server content and adds theme CSS only after mount", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    container.innerHTML = renderToString(<ThemeContent />);
    expect(container.querySelector("style")).toBeNull();
    const serverContent = container.querySelector('[data-testid="content"]');
    const onRecoverableError = vi.fn();
    await act(async () => {
      roots.push(hydrateRoot(container, <ThemeContent />, { onRecoverableError }));
    });
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(container.querySelector('[data-testid="content"]')).toBe(serverContent);
    expect(container.querySelector("style")?.textContent).toContain("color-scheme: dark");
  });

  it("does not apply the global color scheme inside embeds", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    container.innerHTML = renderToString(<ThemeContent isEmbedMode />);
    const onRecoverableError = vi.fn();
    await act(async () => {
      roots.push(hydrateRoot(container, <ThemeContent isEmbedMode />, { onRecoverableError }));
    });
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(container.querySelector("style")).toBeNull();
  });
});
