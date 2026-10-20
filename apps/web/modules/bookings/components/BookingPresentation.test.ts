import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { describe, expect, it } from "vitest";

const styles = readFileSync(
  resolve(process.cwd(), "apps/web/modules/bookings/components/BookingPresentation.module.css"),
  "utf8"
);

describe("booking confirmation presentation", () => {
  it("uses white outside the confirmation card regardless of the color scheme", () => {
    const confirmationPage = styles.match(/\.page\.confirmationPage\s*\{([^}]+)\}/)?.[1];
    expect(confirmationPage).toBeDefined();
    expect(confirmationPage).toMatch(/background:\s*#ffffff\s*;/);
    expect(confirmationPage).not.toMatch(/light-dark|color-scheme/);
  });

  it("preserves the purple card and the separate booker background", () => {
    const card = styles.match(/\.page\s+\.card\s*\{([^}]+)\}/)?.[1];
    const page = styles.match(/\.page\s*\{([^}]+)\}/)?.[1];
    expect(card).toContain("background: light-dark(#ffffff, #221a30)");
    expect(card).toContain("border-color: light-dark(#e7def5, #3a2b50)");
    expect(page).toContain("background: light-dark(#f8f6fc, #171222)");
  });
});
