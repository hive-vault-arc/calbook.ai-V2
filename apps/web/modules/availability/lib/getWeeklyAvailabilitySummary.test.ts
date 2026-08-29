import { describe, expect, it } from "vitest";
import { getWeeklyAvailabilitySummary, orderWeekdays } from "./getWeeklyAvailabilitySummary";

const at = (hour: number, minute = 0) => new Date(Date.UTC(1970, 0, 1, hour, minute));

describe("getWeeklyAvailabilitySummary", () => {
  it("adds recurring hours to every selected day", () => {
    const summary = getWeeklyAvailabilitySummary([
      { days: [1, 2, 3, 4, 5], startTime: at(9), endTime: at(17) },
    ]);

    expect(summary.map(({ minutes }) => minutes)).toEqual([0, 480, 480, 480, 480, 480, 0]);
  });

  it("combines split intervals on the same day", () => {
    const summary = getWeeklyAvailabilitySummary([
      { days: [1], startTime: at(9), endTime: at(12) },
      { days: [1], startTime: at(13, 30), endTime: at(17) },
    ]);

    expect(summary[1].minutes).toBe(390);
  });

  it("ignores invalid days and negative durations", () => {
    const summary = getWeeklyAvailabilitySummary([{ days: [-1, 7, 2], startTime: at(17), endTime: at(9) }]);

    expect(summary.every(({ minutes }) => minutes === 0)).toBe(true);
  });
});

describe("orderWeekdays", () => {
  const days = Array.from({ length: 7 }, (_, day) => ({ day }));

  it("uses Sunday first by default", () => {
    expect(orderWeekdays(days).map(({ day }) => day)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("moves Sunday to the end for Monday-first users", () => {
    expect(orderWeekdays(days, "Monday").map(({ day }) => day)).toEqual([1, 2, 3, 4, 5, 6, 0]);
  });
});
