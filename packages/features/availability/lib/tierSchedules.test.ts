import { describe, expect, it } from "vitest";

import { getAvailableTiers, parseTierSchedules, resolveTierScheduleId } from "./tierSchedules";

describe("tierSchedules", () => {
  describe("parseTierSchedules", () => {
    it("should parse valid tier schedules object", () => {
      const result = parseTierSchedules({ free: 1, pro: 2, premium: 3 });
      expect(result).toEqual({ free: 1, pro: 2, premium: 3 });
    });

    it("should return null for null input", () => {
      expect(parseTierSchedules(null)).toBeNull();
    });

    it("should return null for undefined input", () => {
      expect(parseTierSchedules(undefined)).toBeNull();
    });

    it("should return null for non-object input", () => {
      expect(parseTierSchedules("not an object")).toBeNull();
    });

    it("should filter out non-number schedule IDs", () => {
      const result = parseTierSchedules({ free: 1, bad: "two", premium: 3 });
      expect(result).toEqual({ free: 1, premium: 3 });
    });

    it("should filter out zero or negative schedule IDs", () => {
      const result = parseTierSchedules({ free: 0, pro: -1, premium: 3 });
      expect(result).toEqual({ premium: 3 });
    });

    it("should return null when no valid tiers remain", () => {
      expect(parseTierSchedules({ bad: "string", alsoBad: null })).toBeNull();
    });

    it("should return null for empty object", () => {
      expect(parseTierSchedules({})).toBeNull();
    });
  });

  describe("resolveTierScheduleId", () => {
    it("should resolve the schedule ID for a valid tier", () => {
      const eventType = { scheduleId: 10, tierSchedules: { free: 1, pro: 2 } };
      expect(resolveTierScheduleId(eventType, "pro")).toBe(2);
    });

    it("should fall back to default scheduleId when no tier is provided", () => {
      const eventType = { scheduleId: 10, tierSchedules: { free: 1, pro: 2 } };
      expect(resolveTierScheduleId(eventType, undefined)).toBe(10);
    });

    it("should fall back to default scheduleId when tier is not found", () => {
      const eventType = { scheduleId: 10, tierSchedules: { free: 1, pro: 2 } };
      expect(resolveTierScheduleId(eventType, "enterprise")).toBe(10);
    });

    it("should fall back to default scheduleId when tierSchedules is null", () => {
      const eventType = { scheduleId: 10, tierSchedules: null };
      expect(resolveTierScheduleId(eventType, "pro")).toBe(10);
    });

    it("should return null when no scheduleId and no tierSchedules", () => {
      const eventType = { scheduleId: null, tierSchedules: null };
      expect(resolveTierScheduleId(eventType, "pro")).toBeNull();
    });

    it("should return null when no scheduleId and no tier provided", () => {
      const eventType = { scheduleId: null, tierSchedules: { free: 1 } };
      expect(resolveTierScheduleId(eventType, undefined)).toBeNull();
    });

    it("should resolve tier schedule even when default scheduleId is null", () => {
      const eventType = { scheduleId: null, tierSchedules: { free: 1, pro: 2 } };
      expect(resolveTierScheduleId(eventType, "free")).toBe(1);
    });
  });

  describe("getAvailableTiers", () => {
    it("should return tier names when tierSchedules is configured", () => {
      const eventType = { tierSchedules: { free: 1, pro: 2, premium: 3 } };
      expect(getAvailableTiers(eventType)).toEqual(["free", "pro", "premium"]);
    });

    it("should return empty array when tierSchedules is null", () => {
      const eventType = { tierSchedules: null };
      expect(getAvailableTiers(eventType)).toEqual([]);
    });

    it("should return empty array when tierSchedules is undefined", () => {
      const eventType = { tierSchedules: undefined };
      expect(getAvailableTiers(eventType)).toEqual([]);
    });

    it("should return empty array when tierSchedules is invalid", () => {
      const eventType = { tierSchedules: "invalid" };
      expect(getAvailableTiers(eventType)).toEqual([]);
    });

    it("should only return tiers with valid schedule IDs", () => {
      const eventType = { tierSchedules: { free: 1, bad: "x", premium: 3 } };
      expect(getAvailableTiers(eventType)).toEqual(["free", "premium"]);
    });
  });
});
