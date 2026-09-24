import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PrivacyPage from "../../app/privacy/page";
import TermsPage from "../../app/terms/page";

describe("public legal pages", () => {
  it("renders the CalBook.ai terms with local legal navigation", () => {
    render(<TermsPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Terms of Service" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
    expect(screen.queryByText(/Cal\.com/i)).not.toBeInTheDocument();
  });

  it("publishes the Google API Limited Use disclosure", () => {
    render(<PrivacyPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Privacy Policy" })).toBeInTheDocument();
    expect(screen.getByText(/Google API Services User Data Policy/i)).toBeInTheDocument();
    expect(screen.getByText(/Limited Use requirements/i)).toBeInTheDocument();
  });
});
