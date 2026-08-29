import { describe, expect, it } from "vitest";
import { hasAvailabilityFormChanged } from "./hasAvailabilityFormChanged";

const initialValues = {
  name: "Working hours",
  timeZone: "Europe/London",
  isDefault: true,
  schedule: [[{ start: "09:00", end: "17:00" }]],
  dateOverrides: [],
};

describe("hasAvailabilityFormChanged", () => {
  it("returns false before initial values are available", () => {
    expect(hasAvailabilityFormChanged(null, initialValues)).toBe(false);
  });

  it("returns false for an unchanged form", () => {
    expect(hasAvailabilityFormChanged(initialValues, { ...initialValues })).toBe(false);
  });

  it("detects a weekly-hours change", () => {
    const changedValues = {
      ...initialValues,
      schedule: [[{ start: "10:00", end: "17:00" }]],
    };

    expect(hasAvailabilityFormChanged(initialValues, changedValues)).toBe(true);
  });

  it("detects schedule metadata changes", () => {
    expect(
      hasAvailabilityFormChanged(initialValues, { ...initialValues, timeZone: "Africa/Casablanca" })
    ).toBe(true);
  });
});
