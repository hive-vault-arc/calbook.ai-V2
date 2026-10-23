import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (file: string) =>
  readFileSync(resolve("apps/web/modules/event-types/components", file), "utf8");

describe("event setup theme boundaries", () => {
  it("uses the onboarding palette only on a local light surface", () => {
    const css = source("EventSetupTheme.module.css");
    expect(css).toContain("color-scheme: light");
    expect(css).toContain("--cal-bg-subtle: #faf9ff");
    expect(css).toContain("--cal-text: #292238");
    expect(css).toContain("--cal-brand: #7c3aed");
    expect(css).not.toMatch(/:root|:global|!important/);
  });

  it("preserves visible focus and disabled primary-action behavior", () => {
    const css = source("EventSetupTheme.module.css");
    expect(css).toContain(":focus-visible");
    expect(css).toContain("outline-offset: 3px");
    expect(css).toContain(".primary:hover:not(:disabled)");
  });

  it("scopes setup surfaces and primary action away from platform embeds", () => {
    const layout = source("EventTypeLayout.tsx");
    for (const token of ["surface", "setup", "navigation", "card", "primary"]) {
      expect(layout).toContain(`!isPlatform && theme.${token}`);
    }
    expect(layout).toContain("disabled={!formMethods.formState.isDirty}");
    expect(layout).toContain('form="event-type-form"');
  });

  it("themes the creation dialog without changing its overflow handling", () => {
    const dialog = source("CreateEventTypeDialog.tsx");
    expect(dialog).toContain("theme.surface");
    expect(dialog).toContain("theme.creation");
    expect(dialog).toContain("enableOverflow");
    expect(dialog).toContain("loading={isPending}");
  });
});
