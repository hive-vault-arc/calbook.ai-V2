import { describe, expect, it } from "vitest";
import { getRemainingPackageSessions } from "./getPackageBalance";

describe("getRemainingPackageSessions", () => {
  it("returns the unused package sessions", () => {
    expect(getRemainingPackageSessions({ totalSessions: 5, usedSessions: 2 })).toBe(3);
  });

  it("does not expose a negative balance", () => {
    expect(getRemainingPackageSessions({ totalSessions: 5, usedSessions: 6 })).toBe(0);
  });
});
