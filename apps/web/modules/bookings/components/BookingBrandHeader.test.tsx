import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BookingBrandHeader } from "./BookingBrandHeader";

describe("BookingBrandHeader", () => {
  it("keeps the wordmark readable as text in both themes", () => {
    render(<BookingBrandHeader />);
    const wordmark = screen.getByText("CalBook");
    expect(wordmark).toHaveTextContent("CalBook.ai");
    expect(wordmark).toHaveClass("dark:text-white");
    expect(screen.getByTestId("booking-brand").querySelector("img")).toHaveAttribute("alt", "");
  });
});
